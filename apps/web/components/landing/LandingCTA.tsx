import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { landingContent } from "./content";
import { LaunchDemoButton } from "./LaunchDemoButton";

export function LandingCTA() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-8">
      <div className="command-panel overflow-hidden rounded-lg p-6 md:p-8">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--verified-green)]">Monad-anchored receipts</div>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-normal md:text-5xl">
              Add verifiable evidence receipts to the telemetry you already collect.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Existing sensors keep doing visibility. Sentinel adds privacy-preserving proof for audits, claims, compliance, and disputes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <LaunchDemoButton label={landingContent.hero.primaryCta} />
            <Link
              href="/receipt/sample"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-semibold text-[var(--text-primary)] transition hover:border-[var(--monad-purple)] hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[var(--chain-blue)]"
            >
              <FileCheck2 size={18} />
              {landingContent.hero.secondaryCta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
