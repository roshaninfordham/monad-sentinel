"use client";

import { Boxes, RadioTower, ShieldCheck, Zap } from "lucide-react";
import { useMemo } from "react";
import { shortHash } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function TopStatusBar({ sessionId }: { sessionId: string }) {
  const devicesById = useSentinelStore((state) => state.devices);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  const batches = useSentinelStore((state) => state.batches);
  const telemetryEvents = useSentinelStore((state) => state.telemetryEvents);
  const latestTx = useSentinelStore((state) => state.latestTx);
  const eps = telemetryEvents.filter((time) => time > Date.now() - 1000).length;
  const latestBatch = batches[0];
  const alerts = devices.filter((device) => device.riskScore >= 70).length;

  return (
    <header className="command-panel grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md border border-[rgba(131,110,249,.32)] bg-[rgba(131,110,249,.16)]">
            <ShieldCheck size={18} className="text-[var(--monad-purple-soft)]" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-none">Monad Sentinel</div>
            <div className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Proof-of-custody command center · {sessionId}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 text-right">
        <StatusPill icon={<RadioTower size={14} />} label="LIVE" value={`${devices.length} witnesses`} tone="green" />
        <StatusPill icon={<Zap size={14} />} label="STREAM" value={`${eps} eps`} tone="cyan" />
        <StatusPill icon={<Boxes size={14} />} label="BATCH" value={latestBatch ? `#${latestBatch.sequence}` : "pending"} tone="purple" />
        <StatusPill icon={<ShieldCheck size={14} />} label="TX" value={shortHash(latestTx, 4)} tone="purple" />
        <StatusPill icon={<ShieldCheck size={14} />} label="ALERTS" value={`${alerts}`} tone={alerts ? "red" : "green"} />
      </div>
    </header>
  );
}

function StatusPill({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "cyan" | "purple" | "red";
}) {
  const color =
    tone === "green" ? "var(--verified-green)" : tone === "cyan" ? "var(--chain-blue)" : tone === "red" ? "var(--tamper-red)" : "var(--monad-purple-soft)";
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.16em]" style={{ color }}>
        {icon}
        {label}
      </div>
      <div className="hash mt-1 truncate text-xs text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
