import Link from "next/link";
import { CheckCircle2, FileCheck2, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";

const publicFields = [
  ["Shipment commitment", "0x4f2b...a91c"],
  ["Batch sequence", "#42"],
  ["Merkle root", "0x7a9e...41bc"],
  ["Event count", "128"],
  ["Risk commitment", "0x93d1...0f72"],
  ["Timestamp bucket", "2026-06-09T18:42Z"]
];

const privateFields = [
  "Exact GPS route",
  "Temperature history",
  "Shock waveform",
  "Device identity",
  "Customer/product identity",
  "Receiver handoff details"
];

const verificationSteps = [
  "Payload commitment recomputed from selective reveal",
  "Ciphertext hash matches encrypted off-chain evidence",
  "Device signature recovers the registered witness key",
  "Merkle proof recomputes the batch root",
  "Real deployments compare contract batchRoot through RPC"
];

export default function SampleReceiptPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)]">
      <BackgroundGrid />
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <Link href="/" className="text-sm text-[var(--monad-purple-soft)]">
          Back to landing
        </Link>

        <div className="panel mt-6 rounded-lg p-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[rgba(255,176,32,.12)] px-4 py-2 text-sm text-[var(--warning-amber)]">
            <TriangleAlert size={16} />
            Sample proof receipt
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-6xl">
                Selective reveal without public route exposure.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                This sample shows the receipt shape judges should expect. A live session creates real telemetry rows,
                Merkle proofs, and either a simulated proof path or a real Monad root check when chain env vars are enabled.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--verified-green)] px-5 py-3 font-semibold text-black"
                >
                  <ShieldCheck size={18} />
                  Launch a live proof demo
                </Link>
                <a
                  href="https://github.com/roshaninfordham/monad-sentinel/blob/main/docs/protocol.md"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-semibold text-[var(--text-primary)]"
                >
                  <FileCheck2 size={18} />
                  Read protocol docs
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(131,110,249,.25)] bg-[rgba(131,110,249,.08)] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Public on Monad</div>
              <div className="mt-4 grid gap-2">
                {publicFields.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
                    <span className="text-[var(--text-secondary)]">{label}</span>
                    <span className="hash text-[var(--text-primary)]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-[rgba(255,176,32,.24)] bg-[rgba(255,176,32,.1)] p-3 text-xs leading-5 text-[var(--warning-amber)]">
                Sample values are not linked to an explorer and are never presented as live Monad verification.
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[rgba(76,201,240,.22)] bg-[rgba(76,201,240,.07)] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--chain-blue)]">
                <LockKeyhole size={17} />
                Encrypted off-chain
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {privateFields.map((field) => (
                  <div key={field} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--text-secondary)]">
                    {field}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(37,243,132,.22)] bg-[rgba(37,243,132,.07)] p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--verified-green)]">
                <CheckCircle2 size={17} />
                Verification checklist
              </div>
              <div className="grid gap-2">
                {verificationSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--text-secondary)]">
                    <span className="grid size-6 place-items-center rounded-full bg-[rgba(37,243,132,.12)] text-xs text-[var(--verified-green)]">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
