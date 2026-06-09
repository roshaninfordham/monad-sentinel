import { NextResponse } from "next/server";
import { generateIncidentNarrative } from "@/lib/agents/narrator";
import { incidentNarrationInputSchema } from "@/lib/agents/schemas";

export async function POST(request: Request) {
  const parsed = incidentNarrationInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  return NextResponse.json(await generateIncidentNarrative(parsed.data));
}
