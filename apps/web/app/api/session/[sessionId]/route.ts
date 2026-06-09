import { NextResponse } from "next/server";
import { bytes32FromText } from "@monad-sentinel/shared";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  label: string;
  use_case: string | null;
  contract_session_id: string | null;
  contract_address: string | null;
  shipment_commitment: string | null;
  route_policy_commitment: string | null;
  destination_commitment: string | null;
  active: boolean;
  viewport_mode: string | null;
  delivery_status: string | null;
  created_at: string;
  join_token: string | null;
  dashboard_token_hash: string | null;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      session: {
        id: sessionId,
        label: "Live Custody Swarm",
        useCase: "pharma",
        viewportMode: "indoor",
        contractSessionId: bytes32FromText(sessionId),
        active: true,
        simulatedPersistence: true
      }
    });
  }

  const dashboardToken = new URL(request.url).searchParams.get("d");
  const { data, error } = await supabase
    .from("sessions")
    .select(
      [
        "id",
        "label",
        "use_case",
        "contract_session_id",
        "contract_address",
        "shipment_commitment",
        "route_policy_commitment",
        "destination_commitment",
        "active",
        "viewport_mode",
        "delivery_status",
        "created_at",
        "join_token",
        "dashboard_token_hash"
      ].join(",")
    )
    .eq("id", sessionId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const row = data as unknown as SessionRow;
  const canRevealJoinToken =
    !!dashboardToken && !!row.dashboard_token_hash && (await sha256(dashboardToken)) === row.dashboard_token_hash;

  const { join_token: joinToken, dashboard_token_hash: _dashboardTokenHash, ...session } = row;
  return NextResponse.json({ session, joinToken: canRevealJoinToken ? joinToken : undefined });
}
