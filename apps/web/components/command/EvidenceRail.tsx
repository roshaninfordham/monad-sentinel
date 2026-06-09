"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ExternalLink, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { shortHash } from "@monad-sentinel/shared";
import { getExplorerTxLinks, isSimulatedChainBatch } from "@/lib/chain/explorer";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function EvidenceRail({ sessionId }: { sessionId: string }) {
  const batches = useSentinelStore((state) => state.batches);

  return (
    <div className="panel rounded-lg p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--monad-purple-soft)]">Monad Evidence Rail</div>
          <div className="text-xs text-[var(--text-secondary)]">Merkle batch commitments for signed telemetry</div>
        </div>
        <div className="rounded-full border border-[rgba(76,201,240,.28)] bg-[rgba(76,201,240,.08)] px-3 py-1 text-xs text-[var(--chain-blue)]">
          {process.env.NEXT_PUBLIC_CHAIN_DISABLED === "false" ? "Monad Testnet" : "Simulated chain"}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {batches.map((batch) => {
          const simulated = isSimulatedChainBatch(batch);
          const explorerLinks = getExplorerTxLinks(batch);
          const verifiedOnMonad = !simulated && batch.status === "verified";
          return (
            <motion.div
              key={batch.sequence}
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="min-w-[230px] rounded-lg border border-[rgba(131,110,249,.36)] bg-[rgba(131,110,249,.1)] p-3 shadow-[0_0_22px_rgba(131,110,249,.18)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <Link className="text-sm font-semibold text-[var(--text-primary)]" href={`/receipt/${sessionId}/${batch.sequence}`}>
                  Batch #{batch.sequence}
                </Link>
                {verifiedOnMonad ? (
                  <CheckCircle2 size={16} color="var(--verified-green)" />
                ) : (
                  <TriangleAlert size={16} color={simulated ? "var(--warning-amber)" : "var(--chain-blue)"} />
                )}
              </div>
              <div className="grid gap-1 text-[11px] text-[var(--text-secondary)]">
                <span>{batch.sampleCount} samples · max risk {batch.maxRiskScore}</span>
                <span className="hash">root {shortHash(batch.merkleRoot)}</span>
                {explorerLinks.length ? (
                  <a
                    href={explorerLinks[0].href}
                    target="_blank"
                    rel="noreferrer"
                    className="hash inline-flex items-center gap-1 text-[var(--chain-blue)]"
                  >
                    tx {shortHash(batch.txHash)} <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className={simulated ? "hash text-[var(--warning-amber)]" : "hash text-[var(--text-secondary)]"}>
                    {simulated ? "simulated receipt only" : batch.txHash ? `tx ${shortHash(batch.txHash)}` : "tx pending"}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
        {!batches.length && (
          <div className="rounded-lg border border-dashed border-white/15 px-4 py-6 text-sm text-[var(--text-secondary)]">
            Waiting for first evidence commitment.
          </div>
        )}
      </div>
    </div>
  );
}
