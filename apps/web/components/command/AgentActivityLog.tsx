"use client";

import { Bot, CheckCircle2, GitBranch, ShieldAlert } from "lucide-react";
import { shortHash } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function AgentActivityLog() {
  const incidents = useSentinelStore((state) => state.incidents);
  const batches = useSentinelStore((state) => state.batches);
  const devicesById = useSentinelStore((state) => state.devices);
  const devices = Object.values(devicesById);
  const latestIncident = incidents[0];
  const latestBatch = batches[0];
  const latestDevice = devices.sort((a, b) => b.lastSeen - a.lastSeen)[0];
  const rows = [
    latestDevice
      ? {
          id: "telemetry-agent",
          icon: <Bot size={14} className="text-[var(--chain-blue)]" />,
          agent: "Telemetry Agent",
          action: `accepted signed packet from ${latestDevice.alias}`,
          detail: `${latestDevice.verification.toLowerCase()} · ${shortHash(latestDevice.payloadHash, 4)}`
        }
      : null,
    latestIncident
      ? {
          id: "risk-agent",
          icon: <ShieldAlert size={14} className="text-[var(--tamper-red)]" />,
          agent: "Risk Agent",
          action: latestIncident.reason.includes("Road shock") ? "classified road bump, no breach" : "classified custody anomaly",
          detail: `risk ${latestIncident.riskScore} · flags ${latestIncident.flags}`
        }
      : null,
    latestBatch
      ? {
          id: "chain-agent",
          icon: <GitBranch size={14} className="text-[var(--monad-purple-soft)]" />,
          agent: "Chain Agent",
          action: latestBatch.simulated ? "built Merkle proof in simulated chain mode" : "submitted commitBatch and stored receipt",
          detail: `batch #${latestBatch.sequence} · ${shortHash(latestBatch.merkleRoot, 4)}`
        }
      : null,
    latestBatch
      ? {
          id: "verification-agent",
          icon: <CheckCircle2 size={14} className="text-[var(--verified-green)]" />,
          agent: "Verification Agent",
          action: latestBatch.simulated ? "local proof ready; Monad root not checked" : "root verification available on receipt",
          detail: latestBatch.simulated ? "no explorer link for simulated tx" : `tx ${shortHash(latestBatch.txHash, 4)}`
        }
      : null
  ].filter(Boolean) as Array<{ id: string; icon: React.ReactNode; agent: string; action: string; detail: string }>;

  return (
    <div className="panel max-h-[28vh] overflow-hidden rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Bot size={16} className="text-[var(--chain-blue)]" />
        Agent Activity
      </div>
      <div className="space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[18px_1fr] gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
            {row.icon}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--text-primary)]">{row.agent}</div>
              <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{row.action}</div>
              <div className="hash mt-1 truncate text-[10px] text-[var(--chain-blue)]">{row.detail}</div>
            </div>
          </div>
        ))}
        {!rows.length && <div className="text-sm text-[var(--text-secondary)]">Agents waiting for signed telemetry.</div>}
      </div>
    </div>
  );
}
