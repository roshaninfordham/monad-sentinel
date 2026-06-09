"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Database, EyeOff, GitBranch } from "lucide-react";
import { landingContent, type MetricTone } from "./content";
import { SectionHeading } from "./SectionHeading";

const toneStyles: Record<MetricTone, { color: string; icon: typeof AlertTriangle }> = {
  risk: { color: "var(--tamper-red)", icon: AlertTriangle },
  privacy: { color: "var(--verified-green)", icon: EyeOff },
  integration: { color: "var(--chain-blue)", icon: Database },
  chain: { color: "var(--monad-purple-soft)", icon: GitBranch }
};

export function MetricStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="problem" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading
        eyebrow="The missing layer"
        title="The telemetry exists. The proof layer is missing."
        body="Visibility systems already collect rich shipment data. Sentinel makes that evidence private, portable, and verifiable."
      />
      <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {landingContent.metrics.map((metric, index) => {
          const tone = toneStyles[metric.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={metric.label}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.42, delay: index * 0.08 }}
              className="command-panel rounded-lg p-5"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <Icon size={22} style={{ color: tone.color }} />
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Proof gap
                </span>
              </div>
              <div className="metric-number text-3xl font-semibold" style={{ color: tone.color }}>
                {metric.value}
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{metric.label}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{metric.context}</div>
              {"source" in metric ? <div className="mt-4 text-[11px] leading-5 text-[var(--muted)]">{metric.source}</div> : null}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
