"use client";

import { Activity, AlertTriangle, Boxes, Radio } from "lucide-react";
import { useMemo } from "react";
import { shortHash } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function LiveEvidenceLog() {
  const devicesById = useSentinelStore((state) => state.devices);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  const incidents = useSentinelStore((state) => state.incidents);
  const batches = useSentinelStore((state) => state.batches);
  const rows = [
    ...incidents.slice(0, 3).map((incident) => ({
      id: `incident-${incident.id}`,
      icon: <AlertTriangle size={14} className="text-[var(--tamper-red)]" />,
      label: "risk.alert",
      detail: `${incident.alias} · ${shortHash(incident.payloadHash, 4)}`,
      status: `risk ${incident.riskScore}`
    })),
    ...batches.slice(0, 3).map((batch) => ({
      id: `batch-${batch.sequence}`,
      icon: <Boxes size={14} className="text-[var(--monad-purple-soft)]" />,
      label: "batch.committed",
      detail: `root ${shortHash(batch.merkleRoot, 4)}`,
      status: batch.simulated ? "simulated" : "Monad"
    })),
    ...devices.slice(0, 6).map((device) => ({
      id: `device-${device.id}`,
      icon: <Radio size={14} className="text-[var(--verified-green)]" />,
      label: "telemetry.accepted",
      detail: `${device.alias} · ${device.verification}`,
      status: shortHash(device.payloadHash, 4)
    }))
  ].slice(0, 8);

  return (
    <div className="command-panel min-h-0 rounded-lg p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Activity size={16} className="text-[var(--chain-blue)]" />
        Live Evidence Log
      </div>
      <div className="space-y-2 overflow-hidden">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[18px_1fr_auto] items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-2">
            {row.icon}
            <div className="min-w-0">
              <div className="text-xs text-[var(--text-primary)]">{row.label}</div>
              <div className="hash truncate text-[10px] text-[var(--text-secondary)]">{row.detail}</div>
            </div>
            <div className="hash text-[10px] text-[var(--chain-blue)]">{row.status}</div>
          </div>
        ))}
        {!rows.length && <div className="text-sm text-[var(--text-secondary)]">Awaiting signed telemetry.</div>}
      </div>
    </div>
  );
}
