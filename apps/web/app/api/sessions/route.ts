import { NextResponse } from "next/server";
import { bytes32FromText } from "@monad-sentinel/shared";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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
  const label = body.label ?? "Live Custody Swarm";
  const viewportMode = body.viewportMode ?? body.mode ?? "indoor";
  const useCase = body.useCase ?? "pharma";
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from("sessions").insert({
      id: sessionId,
      label,
      use_case: useCase,
      contract_session_id: contractSessionId,
      contract_address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? null,
      join_token_hash: await sha256(joinToken),
      dashboard_token_hash: await sha256(dashboardToken),
      active: true,
      viewport_mode: viewportMode
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    session: {
      id: sessionId,
      label,
      useCase,
      viewportMode,
      contractSessionId,
      active: true,
      simulatedPersistence: !supabase
    },
    joinToken,
    dashboardToken
  });
}
