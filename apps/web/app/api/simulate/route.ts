import { NextResponse } from "next/server";
import { bytes32FromText } from "@monad-sentinel/shared";
import { broadcastRealtime } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string; count?: number; tamper?: boolean };
  const sessionId = body.sessionId ?? "demo";
  const count = Math.min(Math.max(body.count ?? 50, 1), 200);
  const events = Array.from({ length: count }, (_, index) => ({
    type: "device.joined",
    device: {
      id: `sim-${index + 1}`,
      sessionId,
      alias: `Mobile Witness #${index + 1}`,
      deviceAddress: `0x${(index + 100).toString(16).padStart(40, "0")}`,
      deviceClass: index % 9 === 0 ? "tablet" : "mobile",
      status: "verified",
      latestRiskScore: body.tamper && index === 0 ? 88 : 0,
      latestRiskFlags: body.tamper && index === 0 ? 128 : 0,
      lastSeenAt: new Date().toISOString()
    }
  }));
  await broadcastRealtime(`session:${sessionId}:telemetry`, "simulate.devices", { events });
  return NextResponse.json({
    ok: true,
    sessionId,
    contractSessionId: bytes32FromText(sessionId),
    count,
    realtime: "broadcast-attempted"
  });
}
