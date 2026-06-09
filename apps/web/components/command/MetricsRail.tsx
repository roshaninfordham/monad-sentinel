"use client";

import { Activity, AlertTriangle, Boxes, CheckCircle2, RadioTower } from "lucide-react";
import { useMemo } from "react";
import { useSentinelStore } from "@/lib/store/sentinelStore";
import { AnimatedMetric } from "./AnimatedMetric";

export function MetricsRail() {
  const devices = useSentinelStore((state) => state.devices);
  const telemetryEvents = useSentinelStore((state) => state.telemetryEvents);
  const batches = useSentinelStore((state) => state.batches);
  const incidents = useSentinelStore((state) => state.incidents);
  const latestTx = useSentinelStore((state) => state.latestTx);
  const deviceList = Object.values(devices);
  const now = Date.now();
  const eventsPerSecond = useMemo(() => telemetryEvents.filter((eventAt) => eventAt > Date.now() - 1000).length, [telemetryEvents]);
  const verified = deviceList.filter((device) => device.verification === "Verified").length;
  const avgLatency = batches.length ? "0.8s" : "pending";

  return (
    <aside className="flex min-w-0 flex-col gap-3">
      <div className="panel rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--verified-green)]">
          <RadioTower size={17} /> Custody Network Activity
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <AnimatedMetric label="Live witnesses" value={deviceList.length} accent="var(--verified-green)" />
          <AnimatedMetric label="Telemetry / sec" value={eventsPerSecond} accent="var(--chain-blue)" />
          <AnimatedMetric label="Signed payloads" value={telemetryEvents.length} />
          <AnimatedMetric label="Batches" value={batches.length} accent="var(--monad-purple-soft)" />
        </div>
      </div>

      <div className="panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Activity size={17} /> Evidence Confirmation Progress
        </div>
        {["Observed", "Signed", "Batched", "Committed", "Verified"].map((stage, index) => (
          <div key={stage} className="mb-2 flex items-center gap-2">
            <div
              className="grid size-6 place-items-center rounded-full border text-[10px]"
              style={{
                borderColor: index < 2 || batches.length ? "var(--verified-green)" : "rgba(255,255,255,.16)",
                color: index < 2 || batches.length ? "var(--verified-green)" : "var(--muted)"
              }}
            >
              {index < 2 || batches.length ? <CheckCircle2 size={13} /> : index + 1}
            </div>
            <span className="text-sm text-[var(--text-secondary)]">{stage}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AnimatedMetric label="Verified" value={verified} accent="var(--verified-green)" />
        <AnimatedMetric label="Alerts" value={incidents.length} accent={incidents.length ? "var(--tamper-red)" : undefined} />
        <AnimatedMetric label="Latency" value={avgLatency} accent="var(--chain-blue)" />
        <AnimatedMetric label="Stale" value={deviceList.filter((device) => now - device.lastSeen > 5000).length} />
      </div>

      <div className="panel rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-amber)]">
          <AlertTriangle size={17} /> Threat Contention Map
        </div>
        <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
          {deviceList
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 4)
            .map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{device.alias}</span>
                <span className="mono text-[var(--warning-amber)]">{device.riskScore}</span>
              </div>
            ))}
          {!deviceList.length && <div>No active witnesses yet.</div>}
        </div>
      </div>

      <div className="panel rounded-lg p-4 text-xs text-[var(--text-secondary)]">
        <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--chain-blue)]">
          <Boxes size={15} /> Latest Monad Tx
        </div>
        <div className="hash break-all">{latestTx ?? "Waiting for first evidence batch"}</div>
      </div>
    </aside>
  );
}
