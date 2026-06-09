import { createPublicClient, Hex, http, parseEventLogs } from "viem";
import { sentinelEvidenceLedgerAbi, sentinelEvidenceLedgerAddress } from "@/src/generated/contract";

export type ChainBatchRow = {
  session_id: string;
  sequence: number;
  merkle_root: Hex;
  sample_count?: number | null;
  max_risk_score?: number | null;
  combined_flags?: number | null;
  status?: string | null;
  tx_hash?: Hex | null;
  shipment_commitment?: Hex | null;
  data_availability_hash?: Hex | null;
  time_bucket?: number | null;
  block_number?: number | null;
  contract_address?: Hex | null;
};

export type ChainVerificationResult = {
  verified: boolean;
  mode: "real" | "simulated";
  reason: string;
  txHash: Hex | null;
  blockNumber: number | null;
  contractAddress: Hex | null;
  contractRoot: Hex | null;
  eventRoot: Hex | null;
  checks: {
    chainEnabled: boolean;
    batchNotSimulated: boolean;
    envConfigured: boolean;
    txHashPresent: boolean;
    receiptFound: boolean;
    receiptSuccessful: boolean;
    batchCommittedLogFound: boolean;
    batchCommittedLogMatches: boolean;
    contractRootRead: boolean;
    contractRootMatches: boolean;
  };
};

function emptyChecks(): ChainVerificationResult["checks"] {
  return {
    chainEnabled: false,
    batchNotSimulated: false,
    envConfigured: false,
    txHashPresent: false,
    receiptFound: false,
    receiptSuccessful: false,
    batchCommittedLogFound: false,
    batchCommittedLogMatches: false,
    contractRootRead: false,
    contractRootMatches: false
  };
}

export function isServerChainDisabled() {
  return process.env.CHAIN_MODE === "simulated" || process.env.CHAIN_DISABLED !== "false";
}

export function isServerSimulatedBatch(batch: Pick<ChainBatchRow, "status" | "tx_hash">) {
  const status = batch.status?.toLowerCase();
  return Boolean(status === "simulated" || status === "simulation" || status === "mock" || batch.tx_hash?.toLowerCase().includes("simulated"));
}

function sameHex(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function fail(batch: ChainBatchRow, reason: string, checks: Partial<ChainVerificationResult["checks"]> = {}): ChainVerificationResult {
  return {
    verified: false,
    mode: isServerChainDisabled() || isServerSimulatedBatch(batch) ? "simulated" : "real",
    reason,
    txHash: batch.tx_hash ?? null,
    blockNumber: batch.block_number ?? null,
    contractAddress: batch.contract_address ?? sentinelEvidenceLedgerAddress ?? null,
    contractRoot: null,
    eventRoot: null,
    checks: { ...emptyChecks(), ...checks }
  };
}

export async function verifyBatchOnChain(batch: ChainBatchRow): Promise<ChainVerificationResult> {
  const chainEnabled = !isServerChainDisabled();
  const batchNotSimulated = !isServerSimulatedBatch(batch);

  if (!chainEnabled) {
    return fail(batch, "SIMULATED_CHAIN_MODE", { chainEnabled, batchNotSimulated });
  }
  if (!batchNotSimulated) {
    return fail(batch, "BATCH_MARKED_SIMULATED", { chainEnabled, batchNotSimulated });
  }
  if (!batch.tx_hash) {
    return fail(batch, "TX_HASH_MISSING", { chainEnabled, batchNotSimulated, txHashPresent: false });
  }
  if (!batch.shipment_commitment) {
    return fail(batch, "SHIPMENT_COMMITMENT_MISSING", { chainEnabled, batchNotSimulated, txHashPresent: true });
  }

  const rpcUrl = process.env.MONAD_RPC_URL;
  const contractAddress = batch.contract_address ?? sentinelEvidenceLedgerAddress;
  const envConfigured = Boolean(rpcUrl && contractAddress);
  if (!rpcUrl || !contractAddress) {
    return fail(batch, "MONAD_RPC_OR_CONTRACT_MISSING", {
      chainEnabled,
      batchNotSimulated,
      envConfigured,
      txHashPresent: true
    });
  }

  const client = createPublicClient({ transport: http(rpcUrl) });
  const checks = {
    ...emptyChecks(),
    chainEnabled,
    batchNotSimulated,
    envConfigured,
    txHashPresent: true
  };

  try {
    const receipt = await client.getTransactionReceipt({ hash: batch.tx_hash });
    checks.receiptFound = true;
    checks.receiptSuccessful = receipt.status === "success";

    const logs = parseEventLogs({
      abi: sentinelEvidenceLedgerAbi,
      eventName: "BatchCommitted",
      logs: receipt.logs,
      strict: false
    });
    checks.batchCommittedLogFound = logs.length > 0;

    const matchingLog = logs.find((log) => {
      const args = log.args;
      const sampleCountMatches = batch.sample_count == null || Number(args.sampleCount) === Number(batch.sample_count);
      const riskMatches = batch.max_risk_score == null || Number(args.maxRiskScore) === Number(batch.max_risk_score);
      const flagsMatches = batch.combined_flags == null || Number(args.combinedFlags) === Number(batch.combined_flags);
      const availabilityMatches = !batch.data_availability_hash || sameHex(args.dataAvailabilityHash, batch.data_availability_hash);
      const timeBucketMatches = batch.time_bucket == null || Number(args.timeBucket) === Number(batch.time_bucket);
      return (
        sameHex(log.address, contractAddress) &&
        sameHex(args.shipmentCommitment, batch.shipment_commitment) &&
        Number(args.sequence) === Number(batch.sequence) &&
        sameHex(args.merkleRoot, batch.merkle_root) &&
        sampleCountMatches &&
        riskMatches &&
        flagsMatches &&
        availabilityMatches &&
        timeBucketMatches
      );
    });
    checks.batchCommittedLogMatches = Boolean(matchingLog);

    const contractRoot = await client.readContract({
      address: contractAddress,
      abi: sentinelEvidenceLedgerAbi,
      functionName: "batchRoot",
      args: [batch.shipment_commitment, BigInt(batch.sequence)]
    });
    checks.contractRootRead = true;
    checks.contractRootMatches = sameHex(contractRoot, batch.merkle_root);

    const verified = checks.receiptSuccessful && checks.batchCommittedLogMatches && checks.contractRootMatches;
    return {
      verified,
      mode: "real",
      reason: verified ? "VERIFIED" : "CHAIN_ROOT_OR_EVENT_MISMATCH",
      txHash: batch.tx_hash,
      blockNumber: Number(receipt.blockNumber),
      contractAddress,
      contractRoot,
      eventRoot: matchingLog?.args.merkleRoot ?? null,
      checks
    };
  } catch (error) {
    return {
      verified: false,
      mode: "real",
      reason: error instanceof Error ? error.message : "CHAIN_VERIFICATION_FAILED",
      txHash: batch.tx_hash,
      blockNumber: batch.block_number ?? null,
      contractAddress,
      contractRoot: null,
      eventRoot: null,
      checks
    };
  }
}
