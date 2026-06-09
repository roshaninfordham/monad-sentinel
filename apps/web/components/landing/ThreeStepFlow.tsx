"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Braces, LockKeyhole, RadioTower, ShieldCheck } from "lucide-react";
import { landingContent } from "./content";
import { SectionHeading } from "./SectionHeading";

const stepIcons = [RadioTower, LockKeyhole, ShieldCheck];

export function ThreeStepFlow() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading
        eyebrow="From telemetry to proof"
        title="Three steps from sensor data to a verifiable receipt."
        body="Sentinel is designed to sit underneath existing logistics systems, not replace them."
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {landingContent.threeSteps.map((step, index) => {
          const Icon = stepIcons[index];
          return (
            <div key={step.title} className="contents">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="command-panel rounded-lg p-5"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Step {index + 1}</div>
                    <h3 className="mt-2 text-2xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{step.subtitle}</p>
                  </div>
                  <div className="grid size-11 place-items-center rounded-lg border border-white/10 bg-black/20 text-[var(--monad-purple-soft)]">
                    <Icon size={22} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {step.bullets.map((bullet) => (
                    <span key={bullet} className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-xs text-[var(--text-secondary)]">
                      {bullet}
                    </span>
                  ))}
                </div>
              </motion.div>
              {index < landingContent.threeSteps.length - 1 ? (
                <div className="hidden items-center lg:flex">
                  <ArrowRight className="text-[var(--chain-blue)]" size={22} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-6 max-w-3xl rounded-lg border border-[rgba(76,201,240,.22)] bg-[rgba(76,201,240,.07)] p-4">
        <div className="flex items-start gap-3">
          <Braces className="mt-1 shrink-0 text-[var(--chain-blue)]" size={18} />
          <div className="font-mono text-sm leading-7 text-[var(--text-secondary)]">
            leafHash = H(eventHash || signature || riskFlags)
            <br />
            batchRoot = MerkleRoot(leafHash[])
            <br />
            Monad stores root, not raw GPS.
          </div>
        </div>
      </div>
    </section>
  );
}
