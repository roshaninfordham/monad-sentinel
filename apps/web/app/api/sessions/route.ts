import { NextResponse } from "next/server";
import { bytes32FromText, deriveShipmentCommitment } from "@monad-sentinel/shared";
import { cleanupExpiredDemoData, demoExpiresAt, demoRetentionMinutes, getSupabaseAdmin } from "@/lib/supabase/server";

function randomId(prefix = "") {
  return `${prefix}${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { label?: string; mode?: string; viewportMode?: string; useCase?: string };
  const sessionId = randomId("s_");
  const joinToken = randomId("join_");
  const dashboardToken = randomId("dash_");
  const contractSessionId = bytes32FromText(sessionId);
  const shipmentCommitment = deriveShipmentCommitment(joinToken, sessionId);
  const routePolicyCommitment = bytes32FromText(`${sessionId}:route-policy:indoor-pharma-corridor`);
  const destinationCommitment = bytes32FromText(`${sessionId}:destination:receiver-geofence`);
  const label = body.label ?? "Live Custody Swarm";
  const viewportMode = body.viewportMode ?? body.mode ?? "indoor";
  const useCase = body.useCase ?? "pharma";
  const supabase = getSupabaseAdmin();
  const retentionMinutes = demoRetentionMinutes();
  const expiresAt = demoExpiresAt();

  if (supabase) {
    await cleanupExpiredDemoData();
    const { error } = await supabase.from("sessions").insert({
      id: sessionId,
      label,
      use_case: useCase,
      contract_session_id: contractSessionId,
      contract_address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? null,
      shipment_commitment: shipmentCommitment,
      route_policy_commitment: routePolicyCommitment,
      destination_commitment: destinationCommitment,
      join_token: joinToken,
      join_token_hash: await sha256(joinToken),
      dashboard_token_hash: await sha256(dashboardToken),
      retention_minutes: retentionMinutes,
      expires_at: expiresAt,
      active: true,
      viewport_mode: viewportMode
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { error: shipmentError } = await supabase.from("shipments").insert({
      id: `ship_${sessionId.slice(2)}`,
      session_id: sessionId,
      shipment_commitment: shipmentCommitment,
      product_type: useCase,
      status: "in_transit",
      origin_label: "Origin cold-chain hub",
      destination_label: "Receiver pharmacy dock",
      origin_lat_e7: 407484400,
      origin_lng_e7: -739856600,
      destination_lat_e7: 407586000,
      destination_lng_e7: -739855000,
      route_policy_commitment: routePolicyCommitment,
      destination_commitment: destinationCommitment
    });
    if (shipmentError) {
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }
    await supabase.from("route_policies").insert({
      id: `route_${sessionId.slice(2)}`,
      shipment_id: `ship_${sessionId.slice(2)}`,
      route_policy_commitment: routePolicyCommitment,
      checkpoints: [
        { label: "Origin cold-chain hub", type: "pickup", authorized: true },
        { label: "Receiver pharmacy dock", type: "delivery", authorized: true }
      ]
    });
  }

  return NextResponse.json({
    session: {
      id: sessionId,
      label,
      useCase,
      viewportMode,
      contractSessionId,
      shipmentCommitment,
      routePolicyCommitment,
      destinationCommitment,
      retentionMinutes,
      expiresAt,
      active: true,
      simulatedPersistence: !supabase
    },
    joinToken,
    dashboardToken
  });
}
