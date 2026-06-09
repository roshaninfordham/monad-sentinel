"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { landingContent } from "./content";
import { EvidencePipelineVisual } from "./EvidencePipelineVisual";
import { LaunchDemoButton } from "./LaunchDemoButton";

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const hero = landingContent.hero;

  return (
    <section className="relative z-10 mx-auto grid min-h-[92vh] max-w-7xl items-center gap-8 px-6 pb-12 pt-28 lg:grid-cols-[0.96fr_1.04fr] lg:px-8">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(131,110,249,.32)] bg-[rgba(131,110,249,.12)] px-4 py-2 text-sm text-[var(--monad-purple-soft)]">
          <ShieldCheck size={16} /> {hero.eyebrow}
        </div>
        <h1 className="max-w-5xl text-5xl font-semibold leading-[1.02] tracking-normal text-[var(--text-primary)] md:text-7xl">
          {hero.headline}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-secondary)] md:text-xl">{hero.subheadline}</p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">{hero.target}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <LaunchDemoButton label={hero.primaryCta} />
          <Link
            href="/receipt/sample"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 font-semibold text-[var(--text-primary)] transition hover:border-[var(--monad-purple)] hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[var(--chain-blue)]"
          >
            <FileCheck2 size={18} />
            {hero.secondaryCta}
          </Link>
        </div>

        <div className="mt-8 flex max-w-3xl flex-wrap gap-2">
          {hero.badges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs text-[var(--text-secondary)]"
            >
              <CheckCircle2 size={14} className="text-[var(--verified-green)]" />
              {badge}
            </span>
          ))}
        </div>
      </motion.div>

      <EvidencePipelineVisual />
    </section>
  );
}
