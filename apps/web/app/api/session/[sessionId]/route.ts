import { NextResponse } from "next/server";
import { bytes32FromText } from "@monad-sentinel/shared";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
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

  const { data, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ session: data });
}
