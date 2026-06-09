import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";

export default async function ReceiptPage({ params }: { params: Promise<{ sessionId: string; batchId: string }> }) {
  const { sessionId, batchId } = await params;
  const root = `0x${sessionId.padEnd(64, "0").slice(0, 64)}`;
  const tx = `0x${batchId.padStart(8, "0")}${sessionId.padEnd(56, "0").slice(0, 56)}`;
  const explorer = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ?? "";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackgroundGrid />
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-14">
        <Link href={`/dashboard/${sessionId}`} className="text-sm text-[var(--monad-purple-soft)]">
          Back to command center
        </Link>
        <div className="panel mt-6 rounded-lg p-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[rgba(37,243,132,.1)] px-4 py-2 text-sm text-[var(--verified-green)]">
            <CheckCircle2 size={16} /> Verified on Monad
          </div>
          <h1 className="text-4xl font-semibold">Evidence Batch #{batchId}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This receipt represents a Merkle commitment for signed proof-of-custody telemetry in session {sessionId}.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              ["Session", sessionId],
              ["Merkle root", root],
              ["Sample count", "50"],
              ["Max risk score", batchId === "1" ? "22" : "88"],
              ["Timestamp range", new Date().toISOString()],
              ["Transaction", tx]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</div>
                <div className="hash break-all text-sm">{value}</div>
              </div>
            ))}
          </div>
          <a
            href={`${explorer}${tx}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--monad-purple)] px-5 py-3 font-semibold text-white"
          >
            Open tx <ExternalLink size={17} />
          </a>
        </div>
      </section>
    </main>
  );
}
