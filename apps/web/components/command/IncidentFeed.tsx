"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { shortHash } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function IncidentFeed() {
  const incidents = useSentinelStore((state) => state.incidents);

  return (
    <div className="panel min-h-0 flex-1 overflow-hidden rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--tamper-red)]">
        <ShieldAlert size={17} /> AI Incident Feed
      </div>
      <div className="space-y-3 overflow-hidden">
        <AnimatePresence initial={false}>
          {incidents.map((incident) => (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, x: 30, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 20 }}
              className="rounded-lg border border-[rgba(255,59,92,.32)] bg-[rgba(255,59,92,.08)] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{incident.alias}</span>
                <span className="mono rounded bg-[rgba(255,59,92,.18)] px-2 py-1 text-xs text-[var(--tamper-red)]">
                  Risk {incident.riskScore}
                </span>
              </div>
              <p className="text-xs leading-5 text-[var(--text-secondary)]">{incident.reason}</p>
              <div className="mt-3 grid gap-1 text-[11px] text-[var(--text-secondary)]">
                <span className="hash">evidence {shortHash(incident.payloadHash)}</span>
                <span className="hash">tx {shortHash(incident.txHash)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!incidents.length && <div className="text-sm text-[var(--text-secondary)]">Awaiting custody anomaly.</div>}
      </div>
    </div>
  );
}
