import { CheckCircle2, Database, LockKeyhole, XCircle } from "lucide-react";
import { landingContent } from "./content";
import { SectionHeading } from "./SectionHeading";

export function ComparisonTable() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading title="Visibility shows what happened. Sentinel proves it was not rewritten." />
      <div className="mt-10 overflow-hidden rounded-lg border border-[rgba(180,120,255,.22)] bg-[rgba(18,10,32,.72)]">
        <div className="grid grid-cols-1 border-b border-white/10 bg-white/[0.04] text-sm font-semibold text-[var(--text-primary)] lg:grid-cols-[1fr_1.25fr_1.18fr_1.35fr]">
          <div className="border-b border-white/10 p-4 lg:border-b-0">Capability</div>
          <div className="border-b border-white/10 p-4 lg:border-b-0">
            <span className="inline-flex items-center gap-2">
              <Database size={16} className="text-[var(--chain-blue)]" /> Existing visibility platforms
            </span>
          </div>
          <div className="border-b border-white/10 p-4 lg:border-b-0">
            <span className="inline-flex items-center gap-2">
              <XCircle size={16} className="text-[var(--tamper-red)]" /> Raw blockchain logging
            </span>
          </div>
          <div className="p-4">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[var(--verified-green)]" /> Monad Sentinel
            </span>
          </div>
        </div>
        {landingContent.comparison.map((row) => (
          <div
            key={row.capability}
            className="grid grid-cols-1 border-b border-white/10 last:border-b-0 lg:grid-cols-[1fr_1.25fr_1.18fr_1.35fr]"
          >
            <div className="bg-white/[0.025] p-4 text-sm font-semibold text-[var(--text-primary)]">{row.capability}</div>
            <div className="p-4 text-sm leading-6 text-[var(--text-secondary)]">{row.existing}</div>
            <div className="p-4 text-sm leading-6 text-[var(--text-secondary)]">{row.rawChain}</div>
            <div className="p-4 text-sm leading-6 text-[var(--text-primary)]">
              <span className="inline-flex items-start gap-2">
                <LockKeyhole size={15} className="mt-1 shrink-0 text-[var(--verified-green)]" />
                {row.sentinel}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
