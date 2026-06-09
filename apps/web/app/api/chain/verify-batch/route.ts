import { NextResponse } from "next/server";
import { Hex } from "viem";
import { verifyBatchOnChain, type ChainBatchRow } from "@/lib/chain/verification";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type VerifyRequest = {
  sessionId?: string;
  sequence?: number | string;
};

function parseSequence(value: unknown) {
  const sequence = Number(value);
  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : null;
}

async function verify(input: VerifyRequest) {
  const sessionId = input.sessionId;
  const sequence = parseSequence(input.sequence);
  if (!sessionId || !sequence) {
    return NextResponse.json({ error: "SESSION_ID_AND_SEQUENCE_REQUIRED" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  const { data: batch, error } = await supabase
    .from("telemetry_batches")
    .select(
      "session_id,sequence,merkle_root,sample_count,max_risk_score,combined_flags,status,tx_hash,shipment_commitment,data_availability_hash,time_bucket,block_number,contract_address"
    )
    .eq("session_id", sessionId)
    .eq("sequence", sequence)
    .single<ChainBatchRow>();

  if (error || !batch) {
    return NextResponse.json({ error: error?.message ?? "BATCH_NOT_FOUND" }, { status: 404 });
  }

  const result = await verifyBatchOnChain(batch);
  const now = new Date().toISOString();

  if (result.verified) {
    await supabase
      .from("telemetry_batches")
      .update({
        status: "verified",
        block_number: result.blockNumber,
        committed_at: now,
        error: null
      })
      .eq("session_id", sessionId)
      .eq("sequence", sequence);

    await supabase
      .from("evidence_receipts")
      .update({
        verification_status: "verified",
        verified_at: now
      })
      .eq("session_id", sessionId)
      .eq("batch_sequence", sequence);
  } else if (result.mode === "real") {
    await supabase
      .from("telemetry_batches")
      .update({ error: result.reason })
      .eq("session_id", sessionId)
      .eq("sequence", sequence);
  }

  return NextResponse.json({
    verified: result.verified,
    mode: result.mode,
    reason: result.reason,
    txHash: result.txHash as Hex | null,
    blockNumber: result.blockNumber,
    contractAddress: result.contractAddress,
    contractRoot: result.contractRoot,
    eventRoot: result.eventRoot,
    checks: result.checks
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return verify({
    sessionId: url.searchParams.get("sessionId") ?? undefined,
    sequence: url.searchParams.get("sequence") ?? undefined
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyRequest;
  return verify(body);
}

