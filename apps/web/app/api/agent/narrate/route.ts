import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  alias: z.string().default("Mobile Witness"),
  riskScore: z.number().min(0).max(100),
  reason: z.string(),
  batchSequence: z.number().optional()
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const severity = parsed.data.riskScore >= 90 ? "critical" : parsed.data.riskScore >= 80 ? "tamper" : "suspicious";
  return NextResponse.json({
    severity,
    title: severity === "critical" ? "Critical custody anomaly" : "Tamper detected",
    oneLineSummary: `${parsed.data.alias} triggered ${parsed.data.reason}${
      parsed.data.batchSequence ? ` and was included in Monad evidence batch #${parsed.data.batchSequence}` : ""
    }.`,
    evidence: [
      `Risk score ${parsed.data.riskScore}`,
      parsed.data.reason,
      parsed.data.batchSequence ? `Batch #${parsed.data.batchSequence}` : "Evidence queued for next batch"
    ],
    recommendedAction: "Inspect cargo seal and quarantine the custody handoff.",
    confidence: 0.92,
    deterministicFallback: true
  });
}
