"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Building2, ClipboardCheck, Factory, PackageCheck, Radar, ShieldHalf, Snowflake } from "lucide-react";
import { landingContent } from "./content";
import { SectionHeading } from "./SectionHeading";

const icons = [Factory, Radar, Snowflake, Building2, ShieldHalf, PackageCheck, ClipboardCheck];

export function TargetCustomerGrid() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="for-platforms" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <SectionHeading
        eyebrow="For platforms"
        title="Not another tracker. The proof layer for companies that already track."
        body="Your sensors keep collecting data. Your customers keep using your dashboard. Sentinel adds cryptographic proof receipts underneath."
      />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {landingContent.targetCustomers.map((target, index) => {
          const Icon = icons[index % icons.length];
          return (
            <motion.div
              key={target}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              className="rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-[rgba(169,139,255,.42)] hover:bg-white/[0.065]"
            >
              <Icon className="mb-4 text-[var(--chain-blue)]" size={22} />
              <div className="text-sm font-semibold text-[var(--text-primary)]">{target}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
