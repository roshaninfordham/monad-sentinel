import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, keccak256, parseAbi, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { buildMerkleProof, buildMerkleRoot, bytes32FromText, Hex } from "@monad-sentinel/shared";
import { broadcastRealtime, getSupabaseAdmin } from "@/lib/supabase/server";

const abi = parseAbi([
  "function commitBatch(bytes32 shipmentCommitment,uint64 sequence,bytes32 merkleRoot,uint32 sampleCount,uint16 maxRiskScore,uint16 combinedFlags,bytes32 dataAvailabilityHash,uint256 timeBucket)"
]);

type TelemetryRow = {
  id: number;
  session_id: string;
  device_id: string;
  leaf_hash: Hex;
  risk_score: number | null;
  risk_flags: number | null;
  client_timestamp_ms: number;
};

function simulatedTxHash(seed: string): Hex {
  return keccak256(stringToHex(`serverless-simulated:${seed}:${Date.now()}`));
}

async function nextSequence(sessionId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await supabase
    .from("telemetry_batches")
    .select("sequence")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: false })
    .limit(1);
  if (error) throw error;
  return Number(data?.[0]?.sequence ?? 0) + 1;
}

async function submitCommit(args: {
  sessionId: string;
  sequence: number;
  merkleRoot: Hex;
  sampleCount: number;
  maxRiskScore: number;
  combinedFlags: number;
  shipmentCommitment: Hex;
  dataAvailabilityHash: Hex;
  timeBucket: number;
  firstClientTimestampMs: number;
  lastClientTimestampMs: number;
}) {
  const chainDisabled = process.env.CHAIN_DISABLED !== "false";
  if (chainDisabled) {
    return { txHash: simulatedTxHash(`${args.sessionId}:${args.sequence}`), simulated: true };
  }

  const rpcUrl = process.env.MONAD_RPC_URL;
  const privateKey = process.env.GATEWAY_PRIVATE_KEY as Hex | undefined;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Hex | undefined;
  if (!rpcUrl || !privateKey || !contractAddress) {
    throw new Error("MONAD_ENV_MISSING");
  }

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const txHash = await walletClient.writeContract({
    chain: null,
    address: contractAddress,
    abi,
    functionName: "commitBatch",
    args: [
      args.shipmentCommitment,
      BigInt(args.sequence),
      args.merkleRoot,
      args.sampleCount,
      args.maxRiskScore,
      args.combinedFlags,
      args.dataAvailabilityHash,
      BigInt(args.timeBucket)
    ]
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, blockNumber: Number(receipt.blockNumber), simulated: false };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ error: "SESSION_ID_REQUIRED" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });

  const { data, error } = await supabase
    .from("telemetry_events")
    .select("id,session_id,device_id,leaf_hash,risk_score,risk_flags,client_timestamp_ms")
    .eq("session_id", body.sessionId)
    .is("batch_sequence", null)
    .order("id", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as TelemetryRow[];
  if (!rows.length) {
    return NextResponse.json({ batch: null, reason: "NO_PENDING_TELEMETRY" });
  }

  const sequence = await nextSequence(body.sessionId);
  const leaves = rows.map((row) => row.leaf_hash);
  const merkleRoot = buildMerkleRoot(leaves);
  const { data: session } = await supabase
    .from("sessions")
    .select("shipment_commitment,route_policy_commitment")
    .eq("id", body.sessionId)
    .single();
  const dataAvailabilityHash = keccak256(
    stringToHex(
      JSON.stringify({
        sessionId: body.sessionId,
        eventIds: rows.map((row) => row.id),
        merkleRoot
      })
    )
  );
  const maxRiskScore = Math.max(...rows.map((row) => Number(row.risk_score ?? 0)));
  const combinedFlags = rows.reduce((acc, row) => acc | Number(row.risk_flags ?? 0), 0);
  const firstClientTimestampMs = Number(rows[0].client_timestamp_ms);
  const lastClientTimestampMs = Number(rows[rows.length - 1].client_timestamp_ms);
  const timeBucket = Math.floor(firstClientTimestampMs / 60000) * 60000;

  const { error: batchError } = await supabase.from("telemetry_batches").insert({
    session_id: body.sessionId,
    sequence,
    merkle_root: merkleRoot,
    shipment_commitment: session?.shipment_commitment ?? null,
    route_policy_commitment: session?.route_policy_commitment ?? null,
    data_availability_hash: dataAvailabilityHash,
    time_bucket: timeBucket,
    sample_count: rows.length,
    max_risk_score: maxRiskScore,
    combined_flags: combinedFlags,
    first_client_timestamp_ms: firstClientTimestampMs,
    last_client_timestamp_ms: lastClientTimestampMs,
    status: "pending",
    contract_address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? null,
    submitted_at: new Date().toISOString()
  });
  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });

  const proofRows = rows.map((row, index) => ({
    event_id: row.id,
    session_id: body.sessionId,
    batch_sequence: sequence,
    leaf_index: index,
    proof: buildMerkleProof(leaves, index)
  }));
  const { error: proofError } = await supabase.from("merkle_proofs").upsert(proofRows);
  if (proofError) return NextResponse.json({ error: proofError.message }, { status: 500 });

  const receipt = await submitCommit({
    sessionId: body.sessionId,
    sequence,
    merkleRoot,
    sampleCount: rows.length,
    maxRiskScore,
    combinedFlags,
    shipmentCommitment: (session?.shipment_commitment as Hex | null) ?? bytes32FromText(body.sessionId),
    dataAvailabilityHash,
    timeBucket,
    firstClientTimestampMs,
    lastClientTimestampMs
  });
  const committedAt = new Date().toISOString();

  await supabase
    .from("telemetry_batches")
    .update({
      status: receipt.simulated ? "verified" : "committed",
      tx_hash: receipt.txHash,
      block_number: receipt.blockNumber ?? null,
      committed_at: committedAt
    })
    .eq("session_id", body.sessionId)
    .eq("sequence", sequence);

  const eventIds = rows.map((row) => row.id);
  const deviceIds = [...new Set(rows.map((row) => row.device_id))];
  await supabase.from("telemetry_events").update({ batch_sequence: sequence, tx_hash: receipt.txHash, committed_at: committedAt }).in("id", eventIds);
  await supabase.from("devices").update({ latest_batch_sequence: sequence, latest_tx_hash: receipt.txHash }).in("id", deviceIds);
  await supabase
    .from("custody_events")
    .update({ batch_sequence: sequence, tx_hash: receipt.txHash })
    .in("telemetry_event_id", eventIds);
  await supabase
    .from("incidents")
    .update({ tx_hash: receipt.txHash })
    .eq("session_id", body.sessionId)
    .in("telemetry_event_id", eventIds);
  await supabase.from("evidence_receipts").insert({
    session_id: body.sessionId,
    shipment_id: `ship_${body.sessionId.slice(2)}`,
    batch_sequence: sequence,
    tx_hash: receipt.txHash,
    merkle_root: merkleRoot,
    selected_event_ids: eventIds,
    verification_status: receipt.simulated ? "verified" : "unverified",
    verified_at: receipt.simulated ? committedAt : null
  });

  const batch = {
    sessionId: body.sessionId,
    sequence,
    merkleRoot,
    sampleCount: rows.length,
    maxRiskScore,
    combinedFlags,
    dataAvailabilityHash,
    timeBucket,
    txHash: receipt.txHash,
    status: receipt.simulated ? "verified" : "committed",
    simulated: receipt.simulated
  };
  await broadcastRealtime(`session:${body.sessionId}:chain`, "chain.batch.committed", { type: "chain.batch.committed", batch });

  return NextResponse.json({ batch });
}
