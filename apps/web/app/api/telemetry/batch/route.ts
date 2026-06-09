import { NextResponse } from "next/server";
import {
  buildLeafHash,
  bytes32FromText,
  hashPayload,
  recoverTelemetrySigner,
  scoreRisk,
  signedTelemetrySchema,
  telemetryBatchRequestSchema,
  TelemetryView
} from "@monad-sentinel/shared";
import { getSupabaseAdmin, broadcastRealtime } from "@/lib/supabase/server";

function deviceAlias(deviceId: string) {
  const digits = deviceId.replace(/\D/g, "").slice(-3);
  return `Mobile Witness #${digits || deviceId.slice(0, 4)}`;
}

export async function POST(request: Request) {
  const parsed = telemetryBatchRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const chainId = Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? 10143);
  const verifyingContract = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const accepted: TelemetryView[] = [];
  const incidents = [];

  for (const item of parsed.data.events) {
    const event = signedTelemetrySchema.parse(item);
    const payloadHash = hashPayload(event.payload);
    if (event.payloadHash && event.payloadHash.toLowerCase() !== payloadHash.toLowerCase()) {
      return NextResponse.json({ error: "PAYLOAD_HASH_MISMATCH" }, { status: 400 });
    }

    const recovered = await recoverTelemetrySigner({
      chainId,
      verifyingContract,
      payload: event.payload,
      signature: event.signature as `0x${string}`,
      payloadHash
    });
    if (recovered.toLowerCase() !== event.payload.deviceAddress.toLowerCase()) {
      return NextResponse.json({ error: "SIGNATURE_ADDRESS_MISMATCH" }, { status: 401 });
    }

    const risk = scoreRisk({ payload: event.payload, manualAlert: event.manualAlert });
    const sessionContractId = bytes32FromText(event.payload.sessionId);
    const leafHash = buildLeafHash({
      sessionContractId,
      deviceId: event.payload.deviceId,
      seq: event.payload.seq,
      payloadHash,
      riskScore: risk.riskScore,
      riskFlags: risk.riskFlags,
      clientTimestampMs: event.payload.capturedAt
    });
    const telemetryView: TelemetryView = {
      sessionId: event.payload.sessionId,
      deviceId: event.payload.deviceId,
      seq: event.payload.seq,
      payloadHash,
      leafHash,
      riskScore: risk.riskScore,
      riskFlags: risk.riskFlags,
      riskReason: risk.reason,
      receivedAt: new Date().toISOString()
    };

    if (supabase) {
      const nowIso = new Date().toISOString();
      const device = {
        id: event.payload.deviceId,
        session_id: event.payload.sessionId,
        device_address: event.payload.deviceAddress,
        pubkey_hash: bytes32FromText(event.payload.deviceAddress),
        alias: deviceAlias(event.payload.deviceId),
        device_class: event.payload.deviceClass,
        browser_name: event.payload.browserHints.platform ?? null,
        screen_w: event.payload.browserHints.screenW,
        screen_h: event.payload.browserHints.screenH,
        touch: event.payload.browserHints.touch,
        online: true,
        status: "signed",
        latest_lat_e7: event.payload.latE7,
        latest_lng_e7: event.payload.lngE7,
        latest_accuracy_cm: event.payload.accuracyCm,
        latest_risk_score: risk.riskScore,
        latest_risk_flags: risk.riskFlags,
        last_seen_at: nowIso
      };
      await supabase.from("devices").upsert(device);
      const { data, error } = await supabase
        .from("telemetry_events")
        .insert({
          session_id: event.payload.sessionId,
          device_id: event.payload.deviceId,
          seq: event.payload.seq,
          client_timestamp_ms: event.payload.capturedAt,
          payload_hash: payloadHash,
          leaf_hash: leafHash,
          signature: event.signature,
          recovered_address: recovered,
          lat_e7: event.payload.latE7,
          lng_e7: event.payload.lngE7,
          accuracy_cm: event.payload.accuracyCm,
          speed_cm_s: event.payload.speedCmS ?? null,
          heading_deg: event.payload.headingDeg ?? null,
          accel_peak_mg: Math.round(
            Math.sqrt((event.payload.accelX ?? 0) ** 2 + (event.payload.accelY ?? 0) ** 2 + (event.payload.accelZ ?? 0) ** 2) * 100
          ),
          battery_pct: event.payload.batteryPct ?? null,
          charging: event.payload.charging ?? null,
          simulated_temperature_c_x10: event.manualAlert ? null : 42,
          product_type: "pharma",
          payload: event.payload,
          risk_score: risk.riskScore,
          risk_flags: risk.riskFlags,
          risk_reason: risk.reason
        })
        .select("id")
        .single();
      if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
      telemetryView.id = data?.id;

      if (risk.riskScore >= 70) {
        const { data: incident } = await supabase
          .from("incidents")
          .insert({
            session_id: event.payload.sessionId,
            device_id: event.payload.deviceId,
            telemetry_event_id: data?.id ?? null,
            severity: risk.severity,
            risk_score: risk.riskScore,
            risk_flags: risk.riskFlags,
            title: risk.severity === "critical" ? "Critical custody tamper" : "Tamper detected",
            summary: `${deviceAlias(event.payload.deviceId)}: ${risk.reason}`,
            agent_summary: `${deviceAlias(event.payload.deviceId)} triggered ${risk.reason}. Evidence is queued for Monad.`,
            evidence_hash: payloadHash
          })
          .select("*")
          .single();
        if (incident) incidents.push(incident);
      }
    }

    accepted.push(telemetryView);
    await broadcastRealtime(`session:${event.payload.sessionId}:telemetry`, "device.joined", {
      type: "device.joined",
      device: {
        id: event.payload.deviceId,
        sessionId: event.payload.sessionId,
        alias: deviceAlias(event.payload.deviceId),
        deviceAddress: event.payload.deviceAddress,
        deviceClass: event.payload.deviceClass,
        status: risk.riskScore >= 70 ? "signed" : "live",
        latestRiskScore: risk.riskScore,
        latestRiskFlags: risk.riskFlags,
        lastSeenAt: new Date().toISOString()
      }
    });
    await broadcastRealtime(`session:${event.payload.sessionId}:telemetry`, "telemetry.accepted", { type: "telemetry.accepted", event: telemetryView });
  }

  for (const incident of incidents) {
    await broadcastRealtime(`session:${incident.session_id}:alerts`, "risk.alert", { type: "risk.alert", incident });
  }

  return NextResponse.json({
    accepted,
    incidents,
    persistence: supabase ? "supabase" : "stateless-demo"
  });
}
