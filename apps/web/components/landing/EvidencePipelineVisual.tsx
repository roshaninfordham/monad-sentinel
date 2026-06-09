"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Boxes, CheckCircle2, DatabaseZap, Fingerprint, LockKeyhole, RadioTower, ShieldCheck } from "lucide-react";
import { landingContent } from "./content";

const nodes = [
  {
    title: "Existing Sensors",
    subtitle: "Telemetry already collected",
    icon: RadioTower,
    tone: "var(--chain-blue)",
    items: landingContent.pipeline.sensors
  },
  {
    title: "Sentinel Evidence Engine",
    subtitle: "Private proof processor",
    icon: LockKeyhole,
    tone: "var(--monad-purple-soft)",
    items: landingContent.pipeline.engine
  },
  {
    title: "Monad Proof Receipt",
    subtitle: "Selective verification",
    icon: ShieldCheck,
    tone: "var(--verified-green)",
    items: landingContent.pipeline.receipt
  }
];

const movingDots = Array.from({ length: 12 }, (_, index) => index);

export function EvidencePipelineVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-[rgba(180,120,255,.22)] bg-[rgba(10,5,18,.72)] p-4 shadow-[0_0_60px_rgba(131,110,249,.18)] md:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(76,201,240,.16),transparent_32%),radial-gradient(circle_at_70%_82%,rgba(37,243,132,.12),transparent_30%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(131,110,249,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(131,110,249,.18)_1px,transparent_1px)] [background-size:34px_34px]" />

      {!reduceMotion
        ? movingDots.map((dot) => (
            <motion.span
              key={dot}
              aria-hidden
              className="absolute top-[18%] size-1.5 rounded-full bg-[var(--chain-blue)] shadow-[0_0_12px_var(--chain-blue)]"
              initial={{ x: -24, y: (dot % 6) * 58, opacity: 0 }}
              animate={{ x: ["0%", "48vw"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 4.8, delay: dot * 0.22, repeat: Infinity, ease: "linear" }}
            />
          ))
        : null}

      <div className="relative z-10 grid h-full min-h-[488px] gap-4">
        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1.08fr_auto_1fr]">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div key={node.title} className="contents">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.12, duration: 0.45 }}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-[rgba(255,255,255,.055)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{node.title}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">{node.subtitle}</div>
                    </div>
                    <div className="grid size-10 place-items-center rounded-lg border border-white/10 bg-black/20" style={{ color: node.tone }}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {node.items.map((item) => (
                      <span key={item} className="rounded-md border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-[var(--text-secondary)]">
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>
                {index < nodes.length - 1 ? (
                  <div className="hidden items-center lg:flex">
                    <div className="relative h-px w-12 bg-gradient-to-r from-[var(--chain-blue)] via-[var(--monad-purple-soft)] to-[var(--verified-green)]">
                      <span className="absolute -right-1 -top-1 size-2 rotate-45 border-r border-t border-[var(--verified-green)]" />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-[rgba(131,110,249,.26)] bg-[rgba(131,110,249,.08)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--monad-purple-soft)]">
              <Boxes size={17} /> Merkle compression
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, index) => (
                <motion.div
                  key={index}
                  className="h-8 rounded-md border border-[rgba(169,139,255,.28)] bg-[rgba(169,139,255,.12)]"
                  animate={reduceMotion ? undefined : { opacity: [0.38, 1, 0.38] }}
                  transition={{ duration: 2.8, delay: index * 0.12, repeat: Infinity }}
                />
              ))}
            </div>
            <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 font-mono text-xs text-[var(--text-secondary)]">
              leafHash = H(eventHash || signature || riskFlags)
              <br />
              batchRoot = MerkleRoot(leafHash[])
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(37,243,132,.26)] bg-[rgba(37,243,132,.07)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--verified-green)]">
              <CheckCircle2 size={17} /> Receipt verified
            </div>
            <div className="mt-4 grid gap-2">
              {[
                ["Public root", "0x7a9e...41bc"],
                ["Private route", "encrypted"],
                ["Selective reveal", "auditor only"]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="font-mono text-[var(--text-primary)]">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-[rgba(37,243,132,.12)] px-3 py-2 text-xs text-[var(--verified-green)]">
              <Fingerprint size={15} />
              Customer sees the journey. Public observers see commitments.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-2">
            <DatabaseZap size={15} className="text-[var(--chain-blue)]" />
            Raw telemetry stays encrypted off-chain.
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={15} className="text-[var(--verified-green)]" />
            Monad stores compact proof roots only.
          </span>
        </div>
      </div>
    </div>
  );
}
