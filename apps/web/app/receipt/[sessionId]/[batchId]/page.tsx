import Link from "next/link";
import { CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { createPublicClient, http, parseAbi } from "viem";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { Hex, shortHash, verifyMerkleProof, type MerkleProofStep } from "@monad-sentinel/shared";

type BatchRow = {
  session_id: string;
  sequence: number;
  merkle_root: Hex;
  sample_count: number;
  max_risk_score: number;
  combined_flags: number;
  status: string;
  tx_hash: Hex | null;
  shipment_commitment: Hex | null;
  data_availability_hash: Hex | null;
  time_bucket: number | null;
  first_client_timestamp_ms: number;
  last_client_timestamp_ms: number;
  committed_at: string | null;
};

type TelemetryRow = {
  id: number;
  device_id: string;
  seq: number;
  payload_hash: Hex;
  leaf_hash: Hex;
  event_hash: Hex | null;
  payload_commitment: Hex | null;
  ciphertext_hash: Hex | null;
  risk_commitment: Hex | null;
  signature: Hex;
  recovered_address: Hex;
  event_class: string | null;
  risk_score: number;
  risk_flags: number;
  risk_reason: string | null;
  encrypted_payload: { ciphertextHash?: Hex } | null;
};

type ProofRow = {
  event_id: number;
  leaf_index: number;
  proof: MerkleProofStep[];
};

const batchRootAbi = parseAbi(["function batchRoot(bytes32 shipmentCommitment,uint64 sequence) view returns (bytes32)"]);

function explorerTxUrl(txHash?: string | null) {
  if (!txHash) return null;
  const explorer = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "";
  if (!explorer) return null;
  return explorer.endsWith("/") ? `${explorer}${txHash}` : `${explorer}${txHash}`;
}

async function readContractRoot(batch: BatchRow): Promise<{ checked: boolean; matches: boolean; root?: Hex; reason?: string }> {
  const chainDisabled = process.env.CHAIN_DISABLED !== "false";
  if (chainDisabled) return { checked: false, matches: true, reason: "simulated chain mode" };
  const rpcUrl = process.env.MONAD_RPC_URL;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Hex | undefined;
  if (!rpcUrl || !contractAddress || !batch.shipment_commitment) {
    return { checked: false, matches: false, reason: "Monad RPC or contract address not configured" };
  }
  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const root = await client.readContract({
      address: contractAddress,
      abi: batchRootAbi,
      functionName: "batchRoot",
      args: [batch.shipment_commitment, BigInt(batch.sequence)]
    });
    return { checked: true, matches: root.toLowerCase() === batch.merkle_root.toLowerCase(), root };
  } catch (error) {
    return { checked: false, matches: false, reason: error instanceof Error ? error.message : "contract read failed" };
  }
}

function VerificationLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="mt-1 text-xs text-[var(--text-secondary)]">{value}</div>
      </div>
      <span
        className={
          ok
            ? "inline-flex items-center gap-1 rounded-full bg-[rgba(37,243,132,.1)] px-2.5 py-1 text-xs text-[var(--verified-green)]"
            : "inline-flex items-center gap-1 rounded-full bg-[rgba(255,176,32,.12)] px-2.5 py-1 text-xs text-[var(--warning-amber)]"
        }
      >
        {ok ? <CheckCircle2 size={14} /> : <TriangleAlert size={14} />}
        {ok ? "Verified" : "Pending"}
      </span>
    </div>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ sessionId: string; batchId: string }> }) {
  const { sessionId, batchId } = await params;
  const sequence = Number(batchId);
  const supabase = getSupabaseAdmin();
  const explorer = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "";

  if (!supabase || !Number.isFinite(sequence)) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <BackgroundGrid />
        <section className="relative z-10 mx-auto max-w-3xl px-6 py-14">
          <div className="panel rounded-lg p-8">
            <h1 className="text-3xl font-semibold">Receipt unavailable</h1>
            <p className="mt-3 text-[var(--text-secondary)]">Supabase is not configured or the batch id is invalid.</p>
          </div>
        </section>
      </main>
    );
  }

  const { data: batch } = await supabase
    .from("telemetry_batches")
    .select(
      "session_id,sequence,merkle_root,sample_count,max_risk_score,combined_flags,status,tx_hash,shipment_commitment,data_availability_hash,time_bucket,first_client_timestamp_ms,last_client_timestamp_ms,committed_at"
    )
    .eq("session_id", sessionId)
    .eq("sequence", sequence)
    .single<BatchRow>();

  if (!batch) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        <BackgroundGrid />
        <section className="relative z-10 mx-auto max-w-3xl px-6 py-14">
          <Link href={`/dashboard/${sessionId}`} className="text-sm text-[var(--monad-purple-soft)]">
            Back to command center
          </Link>
          <div className="panel mt-6 rounded-lg p-8">
            <h1 className="text-3xl font-semibold">Batch #{batchId} not found</h1>
            <p className="mt-3 text-[var(--text-secondary)]">Commit telemetry first, then reopen the receipt.</p>
          </div>
        </section>
      </main>
    );
  }

  const { data: event } = await supabase
    .from("telemetry_events")
    .select(
      "id,device_id,seq,payload_hash,leaf_hash,event_hash,payload_commitment,ciphertext_hash,risk_commitment,signature,recovered_address,event_class,risk_score,risk_flags,risk_reason,encrypted_payload"
    )
    .eq("session_id", sessionId)
    .eq("batch_sequence", sequence)
    .order("risk_score", { ascending: false })
    .limit(1)
    .single<TelemetryRow>();

  const { data: proofRow } = event
    ? await supabase.from("merkle_proofs").select("event_id,leaf_index,proof").eq("event_id", event.id).single<ProofRow>()
    : { data: null };

  const proof = (proofRow?.proof ?? []) as MerkleProofStep[];
  const proofValid = event ? verifyMerkleProof(event.leaf_hash, proof, batch.merkle_root) : false;
  const ciphertextHashMatches =
    !!event?.ciphertext_hash && !!event.encrypted_payload?.ciphertextHash
      ? event.ciphertext_hash.toLowerCase() === event.encrypted_payload.ciphertextHash.toLowerCase()
      : !!event?.ciphertext_hash;
  const signatureRecorded = !!event?.signature && !!event.recovered_address;
  const commitmentRecorded = !!event?.payload_commitment && !!event.event_hash && !!event.risk_commitment;
  const contractRoot = await readContractRoot(batch);
  const simulatedChain = process.env.CHAIN_DISABLED !== "false" || batch.tx_hash?.startsWith("0x") && batch.status === "verified";
  const verified = !!event && proofValid && ciphertextHashMatches && signatureRecorded && commitmentRecorded && contractRoot.matches;
  const txUrl = explorerTxUrl(batch.tx_hash);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackgroundGrid />
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-14">
        <Link href={`/dashboard/${sessionId}`} className="text-sm text-[var(--monad-purple-soft)]">
          Back to command center
        </Link>
        <div className="panel mt-6 rounded-lg p-8">
          <div
            className={
              verified
                ? "mb-6 inline-flex items-center gap-2 rounded-full bg-[rgba(37,243,132,.1)] px-4 py-2 text-sm text-[var(--verified-green)]"
                : "mb-6 inline-flex items-center gap-2 rounded-full bg-[rgba(255,176,32,.12)] px-4 py-2 text-sm text-[var(--warning-amber)]"
            }
          >
            {verified ? <ShieldCheck size={16} /> : <TriangleAlert size={16} />}
            {verified ? (contractRoot.checked ? "Verified on Monad" : "Verified in simulated chain mode") : "Verification pending"}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <h1 className="text-4xl font-semibold">Evidence Batch #{batch.sequence}</h1>
              <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">
                Raw GPS, condition data, and device identity stay encrypted off-chain. This receipt verifies the selected
                event against its private evidence commitment, Merkle proof, and Monad batch root.
              </p>
            </div>
            <div className="rounded-lg border border-[rgba(131,110,249,.25)] bg-[rgba(131,110,249,.08)] p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Public Monad Data</div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Root</span>
                  <span className="hash">{shortHash(batch.merkle_root)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Samples</span>
                  <span>{batch.sample_count}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Risk flags</span>
                  <span>{batch.combined_flags}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--text-secondary)]">Tx</span>
                  <span className="hash">{shortHash(batch.tx_hash ?? undefined)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {[
              ["Shipment commitment", batch.shipment_commitment ?? "not stored"],
              ["Merkle root", batch.merkle_root],
              ["Data availability hash", batch.data_availability_hash ?? "not stored"],
              ["Selected event hash", event?.event_hash ?? "no event selected"],
              ["Payload commitment", event?.payload_commitment ?? "not stored"],
              ["Ciphertext hash", event?.ciphertext_hash ?? "not stored"],
              ["Recovered signer", event?.recovered_address ?? "not recorded"],
              ["Time window", `${new Date(batch.first_client_timestamp_ms).toISOString()} → ${new Date(batch.last_client_timestamp_ms).toISOString()}`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</div>
                <div className="hash break-all text-sm">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3">
            <VerificationLine
              label="Payload commitment recorded"
              value="The plaintext payload is not public. The salted payload commitment is stored for selective reveal."
              ok={commitmentRecorded}
            />
            <VerificationLine
              label="Ciphertext hash matches encrypted evidence"
              value="AES-GCM ciphertext is stored off-chain; the hash is committed into the event hash."
              ok={ciphertextHashMatches}
            />
            <VerificationLine
              label="Device signature recorded at ingest"
              value={event ? `Recovered ${shortHash(event.recovered_address)}` : "No selected telemetry event found"}
              ok={signatureRecorded}
            />
            <VerificationLine
              label="Merkle inclusion proof"
              value={proofRow ? `Leaf index ${proofRow.leaf_index}; proof length ${proof.length}` : "No Merkle proof row found"}
              ok={proofValid}
            />
            <VerificationLine
              label={contractRoot.checked ? "Contract batchRoot matches" : "Monad root check"}
              value={contractRoot.checked ? `Contract root ${shortHash(contractRoot.root)}` : (contractRoot.reason ?? "not checked")}
              ok={contractRoot.matches}
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {txUrl ? (
              <a
                href={txUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-[var(--monad-purple)] px-5 py-3 font-semibold text-white"
              >
                Open tx <ExternalLink size={17} />
              </a>
            ) : null}
            <Link
              href={`/shipment/${sessionId}`}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-3 font-semibold text-[var(--text-primary)]"
            >
              View shipment journey
            </Link>
          </div>
          {explorer ? null : <p className="mt-4 text-xs text-[var(--text-secondary)]">Monad explorer URL is not configured.</p>}
        </div>
      </section>
    </main>
  );
}
