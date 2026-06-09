import { NextResponse } from "next/server";
import {
  accelerationMagnitude,
  buildLeafHash,
  bytes32FromText,
  classifyCustodyRisk,
  deriveDevicePseudonym,
  hashPayload,
  Hex,
  recoverTelemetrySigner,
  shockEnergy,
  signedTelemetrySchema,
  telemetryBatchRequestSchema,
  TelemetryView
} from "@monad-sentinel/shared";
import { encryptPrivateEvidence } from "@/lib/evidence/privateEvidence";
import { getSupabaseAdmin, broadcastRealtime } from "@/lib/supabase/server";

function deviceAlias(deviceId: string) {
  const digits = deviceId.replace(/\D/g, "").slice(-3);
  return `Mobile Witness #${digits || deviceId.slice(0, 4)}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function titleForEventClass(eventClass: string) {
  if (eventClass === "bump") return "Road shock detected";
  if (eventClass === "mishandling") return "Handling risk detected";
  if (eventClass === "likely_theft") return "Likely theft pattern";
  if (eventClass === "cold_chain") return "Cold-chain excursion";
  if (eventClass === "delivery") return "Delivery evidence";
  return "Custody event";
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
  let sessionRecord: {
    join_token_hash?: string | null;
    join_token?: string | null;
    contract_session_id?: string | null;
    shipment_commitment?: Hex | null;
  } | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("sessions")
      .select("join_token_hash,join_token,contract_session_id,shipment_commitment")
      .eq("id", parsed.data.sessionId)
      .single();
    if (error) return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 });
    sessionRecord = data;
    const token = parsed.data.joinToken ?? parsed.data.events[0]?.joinToken;
    if (sessionRecord?.join_token_hash && (!token || (await sha256(token)) !== sessionRecord.join_token_hash)) {
      return NextResponse.json({ error: "INVALID_JOIN_TOKEN" }, { status: 401 });
    }
  }

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

    const magnitude = accelerationMagnitude({ x: event.payload.accelX, y: event.payload.accelY, z: event.payload.accelZ });
    const scenario = event.scenario ?? (event.manualAlert ? "mishandling" : undefined);
    const risk = classifyCustodyRisk({
      shockEnergy: shockEnergy([{ magnitude, dtSeconds: 0.8 }]),
      jerkPeak: Math.max(0, (magnitude - 9.8) / 0.8),
      routeDeviationM: scenario === "theft" ? 80 : 0,
      unauthorizedStopSeconds: scenario === "theft" ? 420 : 0,
      sealBroken: scenario === "theft",
      temperatureCx10: scenario === "cold_chain" ? 116 : event.payload.temperatureCx10,
      exposureDegreeMinutes: scenario === "cold_chain" ? 18 : undefined,
      manualTheft: scenario === "theft"
    });
    const evidencePayload = {
      ...event.payload,
      shipmentCommitment: sessionRecord?.shipment_commitment ?? event.payload.shipmentCommitment,
      devicePseudonym:
        event.payload.devicePseudonym ??
        (sessionRecord?.join_token ? deriveDevicePseudonym(sessionRecord.join_token, event.payload.deviceAddress) : undefined)
    };
    const privateEvidence = await encryptPrivateEvidence({
      payload: evidencePayload,
      signature: event.signature as `0x${string}`,
      risk
    });
    const sessionContractId = bytes32FromText(event.payload.sessionId);
    const legacyLeafHash = buildLeafHash({
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
      leafHash: privateEvidence.leafHash,
      eventHash: privateEvidence.eventHash,
      payloadCommitment: privateEvidence.payloadCommitment,
      ciphertextHash: privateEvidence.envelope.ciphertextHash,
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
        latest_batch_sequence: null,
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
          leaf_hash: privateEvidence.leafHash,
          signature: event.signature,
          recovered_address: recovered,
          shipment_commitment: privateEvidence.shipmentCommitment,
          device_pseudonym: privateEvidence.devicePseudonym,
          payload_salt: privateEvidence.payloadSalt,
          payload_commitment: privateEvidence.payloadCommitment,
          ciphertext: privateEvidence.envelope.ciphertext,
          ciphertext_hash: privateEvidence.envelope.ciphertextHash,
          previous_event_hash: privateEvidence.previousEventHash,
          event_hash: privateEvidence.eventHash,
          risk_commitment: privateEvidence.riskCommitment,
          legacy_leaf_hash: legacyLeafHash,
          evidence_version: 1,
          event_class: risk.eventClass,
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
          temperature_c_x10: scenario === "cold_chain" ? 116 : (event.payload.temperatureCx10 ?? null),
          simulated_temperature_c_x10: scenario === "cold_chain" ? 116 : (event.payload.temperatureCx10 ?? 42),
          product_type: "pharma",
          encrypted_payload: privateEvidence.envelope,
          payload: {
            encrypted: true,
            shipmentCommitment: privateEvidence.shipmentCommitment,
            devicePseudonym: privateEvidence.devicePseudonym,
            payloadCommitment: privateEvidence.payloadCommitment,
            ciphertextHash: privateEvidence.envelope.ciphertextHash,
            eventHash: privateEvidence.eventHash,
            previousEventHash: privateEvidence.previousEventHash,
            publicFields: {
              seq: event.payload.seq,
              capturedAt: event.payload.capturedAt,
              deviceClass: event.payload.deviceClass,
              riskFlags: risk.riskFlags
            }
          },
          risk_score: risk.riskScore,
          risk_flags: risk.riskFlags,
          risk_reason: risk.reason
        })
        .select("id")
        .single();
      if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
      telemetryView.id = data?.id;
      if (data?.id) {
        await supabase.from("custody_events").insert({
          session_id: event.payload.sessionId,
          shipment_id: `ship_${event.payload.sessionId.slice(2)}`,
          telemetry_event_id: data.id,
          type: risk.eventClass === "likely_theft" ? "route_deviation" : risk.eventClass === "cold_chain" ? "temperature_excursion" : risk.eventClass === "bump" ? "shock" : "telemetry",
          device_pseudonym: privateEvidence.devicePseudonym,
          event_hash: privateEvidence.eventHash,
          timestamp_ms: event.payload.capturedAt,
          metadata: {
            eventClass: risk.eventClass,
            riskScore: risk.riskScore,
            riskFlags: risk.riskFlags,
            payloadCommitment: privateEvidence.payloadCommitment,
            ciphertextHash: privateEvidence.envelope.ciphertextHash
          }
        });
      }

      if (risk.riskScore >= 30) {
        const { data: incident } = await supabase
          .from("incidents")
          .insert({
            session_id: event.payload.sessionId,
            device_id: event.payload.deviceId,
            telemetry_event_id: data?.id ?? null,
            severity: risk.severity,
            risk_score: risk.riskScore,
            risk_flags: risk.riskFlags,
            title: titleForEventClass(risk.eventClass),
            summary: `${deviceAlias(event.payload.deviceId)}: ${risk.reason}`,
            agent_summary: `${deviceAlias(event.payload.deviceId)} classified as ${risk.eventClass}: ${risk.reason}. Evidence is encrypted and queued for Monad anchoring.`,
            evidence_hash: privateEvidence.eventHash
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
