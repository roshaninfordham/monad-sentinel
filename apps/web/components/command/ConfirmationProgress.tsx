"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { useSentinelStore } from "@/lib/store/sentinelStore";

const stages = ["Observed", "Signed", "Encrypted", "Stored", "Batched", "Submitted", "Included", "Root verified"];

export function ConfirmationProgress() {
  const devicesById = useSentinelStore((state) => state.devices);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  const batches = useSentinelStore((state) => state.batches);
  const hasDevices = devices.length > 0;
  const hasBatch = batches.length > 0;
  const hasSubmittedBatch = batches.some((batch) => !batch.simulated && (batch.status === "committed" || batch.status === "verified"));
  const hasRealVerifiedRoot = batches.some((batch) => !batch.simulated && batch.status === "verified");
  const activeIndex = hasRealVerifiedRoot ? 7 : hasSubmittedBatch ? 6 : hasBatch ? 4 : hasDevices ? 3 : 0;
  const modeLabel = batches[0]?.simulated ? "Simulated chain; local proof only" : "Observed → Signed → Encrypted → Monad root";

  return (
    <div className="command-panel rounded-lg px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Evidence Confirmation</div>
        <div className="text-xs text-[var(--text-secondary)]">{modeLabel}</div>
      </div>
      <div className="confirmation-grid">
        {stages.map((stage, index) => {
          const done = index <= activeIndex;
          return (
            <div key={stage} className="relative rounded-md border border-white/10 bg-white/[0.035] px-2 py-2 text-center">
              <div className="mx-auto mb-1 grid size-6 place-items-center rounded-full" style={{ background: done ? "rgba(37,243,132,.12)" : "rgba(255,255,255,.06)" }}>
                {done ? <CheckCircle2 size={14} className="text-[var(--verified-green)]" /> : <span className="text-[10px] text-[var(--muted)]">{index + 1}</span>}
              </div>
              <div className={done ? "text-xs text-[var(--text-primary)]" : "text-xs text-[var(--text-secondary)]"}>{stage}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
