import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient, createWalletClient, http, parseAbi, stringToHex, keccak256, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { buildMerkleProof, buildMerkleRoot, bytes32FromText, Hex } from "@monad-sentinel/shared";

const chainDisabled = process.env.CHAIN_DISABLED !== "false";
const pollMs = Number(process.env.CHAIN_AGENT_POLL_MS ?? 1000);
const maxBatchSize = Number(process.env.CHAIN_AGENT_MAX_BATCH_SIZE ?? 200);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Hex | undefined;
const rpcUrl = process.env.MONAD_RPC_URL;
const gatewayPrivateKey = process.env.GATEWAY_PRIVATE_KEY as Hex | undefined;

const abi = parseAbi([
  "function shipments(bytes32 shipmentCommitment) view returns (address authority,bytes32 routePolicyCommitment,bytes32 destinationCommitment,uint64 createdAt,bool active,bool delivered)",
  "function createShipment(bytes32 shipmentCommitment,bytes32 routePolicyCommitment,bytes32 destinationCommitment)",
  "function commitBatch(bytes32 shipmentCommitment,uint64 sequence,bytes32 merkleRoot,uint32 sampleCount,uint16 maxRiskScore,uint16 combinedFlags,bytes32 dataAvailabilityHash,uint256 timeBucket)"
]);

type SupabaseAny = ReturnType<typeof createClient<any, "public", any>>;
type TelemetryRow = {
  id: number;
  session_id: string;
  device_id: string;
  seq: number;
  leaf_hash: string;
  risk_score: number | null;
  risk_flags: number | null;
  client_timestamp_ms: number;
};

function requireSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient<any, "public", any>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function simulatedTxHash(seed: string): Hex {
  return keccak256(stringToHex(`simulated:${seed}:${Date.now()}`));
}

async function nextSequence(supabase: SupabaseAny, sessionId: string) {
  const { data, error } = await supabase
    .from("telemetry_batches")
    .select("sequence")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ sequence: number }>;
  return Number(rows[0]?.sequence ?? 0) + 1;
}

async function commitToMonad(args: {
  sessionId: string;
  sequence: number;
  merkleRoot: Hex;
  sampleCount: number;
  maxRiskScore: number;
  combinedFlags: number;
  shipmentCommitment?: Hex;
  routePolicyCommitment?: Hex | null;
  destinationCommitment?: Hex | null;
  dataAvailabilityHash?: Hex;
  timeBucket?: number;
  firstClientTimestampMs: number;
  lastClientTimestampMs: number;
}): Promise<{ txHash: Hex; blockNumber?: bigint; simulated: boolean }> {
  if (chainDisabled) {
    return { txHash: simulatedTxHash(`${args.sessionId}:${args.sequence}`), simulated: true };
  }
  if (!rpcUrl || !gatewayPrivateKey || !contractAddress) {
    throw new Error("MONAD_RPC_URL, GATEWAY_PRIVATE_KEY, and NEXT_PUBLIC_CONTRACT_ADDRESS are required when CHAIN_DISABLED=false");
  }

  const account = privateKeyToAccount(gatewayPrivateKey);
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
  const shipmentCommitment = args.shipmentCommitment ?? bytes32FromText(args.sessionId);
  const shipment = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "shipments",
    args: [shipmentCommitment]
  });
  if (shipment[0] === zeroAddress) {
    const createTx = await walletClient.writeContract({
      chain: null,
      address: contractAddress,
      abi,
      functionName: "createShipment",
      args: [
        shipmentCommitment,
        args.routePolicyCommitment ?? "0x0000000000000000000000000000000000000000000000000000000000000000",
        args.destinationCommitment ?? "0x0000000000000000000000000000000000000000000000000000000000000000"
      ]
    });
    await publicClient.waitForTransactionReceipt({ hash: createTx });
  }
  const txHash = await walletClient.writeContract({
    chain: null,
    address: contractAddress,
    abi,
    functionName: "commitBatch",
    args: [
      shipmentCommitment,
      BigInt(args.sequence),
      args.merkleRoot,
      args.sampleCount,
      args.maxRiskScore,
      args.combinedFlags,
      args.dataAvailabilityHash ?? "0x0000000000000000000000000000000000000000000000000000000000000000",
      BigInt(args.timeBucket ?? args.firstClientTimestampMs)
    ]
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, blockNumber: receipt.blockNumber, simulated: false };
}

async function processSession(supabase: SupabaseAny, sessionId: string) {
  const { data: events, error } = await supabase
    .from("telemetry_events")
    .select("id,session_id,device_id,seq,leaf_hash,risk_score,risk_flags,client_timestamp_ms")
    .eq("session_id", sessionId)
    .is("batch_sequence", null)
    .order("id", { ascending: true })
    .limit(maxBatchSize);
  if (error) throw error;
  const rows = (events ?? []) as TelemetryRow[];
  if (!rows.length) return null;

  const sequence = await nextSequence(supabase, sessionId);
  const leaves = rows.map((event) => event.leaf_hash as Hex);
  const merkleRoot = buildMerkleRoot(leaves);
  const { data: session } = await supabase
    .from("sessions")
    .select("shipment_commitment,route_policy_commitment,destination_commitment")
    .eq("id", sessionId)
    .single();
  const dataAvailabilityHash = keccak256(
    stringToHex(
      JSON.stringify({
        sessionId,
        eventIds: rows.map((event) => event.id),
        merkleRoot
      })
    )
  );
  const sampleCount = rows.length;
  const maxRiskScore = Math.max(...rows.map((event) => Number(event.risk_score ?? 0)));
  const combinedFlags = rows.reduce((acc, event) => acc | Number(event.risk_flags ?? 0), 0);
  const firstClientTimestampMs = Number(rows[0].client_timestamp_ms);
  const lastClientTimestampMs = Number(rows[rows.length - 1].client_timestamp_ms);
  const timeBucket = Math.floor(firstClientTimestampMs / 60000) * 60000;

  const { error: batchError } = await supabase.from("telemetry_batches").insert({
    session_id: sessionId,
    sequence,
    merkle_root: merkleRoot,
    shipment_commitment: session?.shipment_commitment ?? null,
    route_policy_commitment: session?.route_policy_commitment ?? null,
    data_availability_hash: dataAvailabilityHash,
    time_bucket: timeBucket,
    sample_count: sampleCount,
    max_risk_score: maxRiskScore,
    combined_flags: combinedFlags,
    first_client_timestamp_ms: firstClientTimestampMs,
    last_client_timestamp_ms: lastClientTimestampMs,
    status: "pending",
    contract_address: contractAddress ?? null,
    submitted_at: new Date().toISOString()
  });
  if (batchError) throw batchError;

  await supabase.from("merkle_proofs").insert(
    rows.map((event, index) => ({
      event_id: event.id,
      session_id: sessionId,
      batch_sequence: sequence,
      leaf_index: index,
      proof: buildMerkleProof(leaves, index)
    }))
  );

  const receipt = await commitToMonad({
    sessionId,
    sequence,
    merkleRoot,
    sampleCount,
    maxRiskScore,
    combinedFlags,
    shipmentCommitment: (session?.shipment_commitment as Hex | null) ?? bytes32FromText(sessionId),
    routePolicyCommitment: session?.route_policy_commitment as Hex | null,
    destinationCommitment: session?.destination_commitment as Hex | null,
    dataAvailabilityHash,
    timeBucket,
    firstClientTimestampMs,
    lastClientTimestampMs
  });

  const committedAt = new Date().toISOString();
  await supabase
    .from("telemetry_batches")
    .update({
      status: receipt.simulated ? "simulated" : "committed",
      tx_hash: receipt.txHash,
      block_number: receipt.blockNumber ? Number(receipt.blockNumber) : null,
      committed_at: committedAt
    })
    .eq("session_id", sessionId)
    .eq("sequence", sequence);

  await supabase
    .from("telemetry_events")
    .update({ batch_sequence: sequence, tx_hash: receipt.txHash, committed_at: committedAt })
    .in(
      "id",
      rows.map((event) => event.id)
    );
  await supabase
    .from("devices")
    .update({ latest_batch_sequence: sequence, latest_tx_hash: receipt.txHash })
    .in("id", [...new Set(rows.map((event) => event.device_id))]);
  await supabase
    .from("custody_events")
    .update({ batch_sequence: sequence, tx_hash: receipt.txHash })
    .in(
      "telemetry_event_id",
      rows.map((event) => event.id)
    );
  await supabase.from("evidence_receipts").insert({
    session_id: sessionId,
    shipment_id: `ship_${sessionId.slice(2)}`,
    batch_sequence: sequence,
    tx_hash: receipt.txHash,
    merkle_root: merkleRoot,
    selected_event_ids: rows.map((event) => event.id),
    verification_status: receipt.simulated ? "simulated" : "unverified",
    verified_at: null
  });

  await supabase.channel(`session:${sessionId}:chain`).send({
    type: "broadcast",
    event: "chain.batch.committed",
    payload: {
      type: "chain.batch.committed",
      batch: {
        sessionId,
        sequence,
        merkleRoot,
        sampleCount,
        maxRiskScore,
        combinedFlags,
        dataAvailabilityHash,
        timeBucket,
        txHash: receipt.txHash,
        status: receipt.simulated ? "simulated" : "committed",
        simulated: receipt.simulated
      }
    }
  });

  return { sessionId, sequence, sampleCount, txHash: receipt.txHash, simulated: receipt.simulated };
}

async function tick() {
  const supabase = requireSupabase();
  if (!supabase) {
    console.log("[chain-agent] waiting for Supabase env; no durable telemetry to batch");
    return;
  }
  const { data: rows, error } = await supabase
    .from("telemetry_events")
    .select("session_id")
    .is("batch_sequence", null)
    .order("id", { ascending: true })
    .limit(1000);
  if (error) throw error;

  const sessions = [...new Set((rows ?? []).map((row) => row.session_id as string))];
  for (const sessionId of sessions) {
    const result = await processSession(supabase, sessionId);
    if (result) {
      console.log(
        `[chain-agent] ${result.simulated ? "SIMULATED" : "COMMITTED"} session=${result.sessionId} batch=${result.sequence} samples=${result.sampleCount} tx=${result.txHash}`
      );
    }
  }
}

let tickInFlight = false;

console.log(`[chain-agent] starting (${chainDisabled ? "simulated chain" : "Monad Testnet"})`);
setInterval(() => {
  if (tickInFlight) return;
  tickInFlight = true;
  tick()
    .catch((error) => console.error("[chain-agent]", error.message ?? error))
    .finally(() => {
      tickInFlight = false;
    });
}, pollMs);
