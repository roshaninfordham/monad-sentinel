"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, QrCode, Smartphone, Zap } from "lucide-react";
import { landingContent } from "./content";
import { LaunchDemoButton } from "./LaunchDemoButton";
import { SectionHeading } from "./SectionHeading";

export function DemoPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="demo" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading
        eyebrow="Live proof demo"
        title="See the evidence layer live."
        body="Phones emulate tracker devices, but the important part is the protocol: signed, private telemetry becomes a verifiable receipt."
      />
      <div className="mt-10 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {landingContent.demoPreview.map((step, index) => (
          <motion.div
            key={step}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.07, duration: 0.35 }}
            className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="grid size-8 place-items-center rounded-full bg-[rgba(131,110,249,.14)] text-xs font-semibold text-[var(--monad-purple-soft)]">
                {index + 1}
              </span>
              {index === 1 ? (
                <QrCode size={18} className="text-[var(--chain-blue)]" />
              ) : index === 2 ? (
                <Smartphone size={18} className="text-[var(--verified-green)]" />
              ) : index === 3 ? (
                <Zap size={18} className="text-[var(--warning-amber)]" />
              ) : (
                <CheckCircle2 size={18} className="text-[var(--monad-purple-soft)]" />
              )}
            </div>
            <div className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{step}</div>
          </motion.div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <LaunchDemoButton label="Launch Live Proof Demo" />
      </div>
    </section>
  );
}
