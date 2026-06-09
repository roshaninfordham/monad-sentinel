"use client";

import { AlertTriangle, Boxes, LockKeyhole, RadioTower } from "lucide-react";
import { useMemo } from "react";
import { useSentinelStore } from "@/lib/store/sentinelStore";
import { AnimatedMetric } from "./AnimatedMetric";

export function MetricsRail() {
  const devices = useSentinelStore((state) => state.devices);
  const telemetryEvents = useSentinelStore((state) => state.telemetryEvents);
  const batches = useSentinelStore((state) => state.batches);
  const incidents = useSentinelStore((state) => state.incidents);
  const deviceList = Object.values(devices);
  const now = Date.now();
  const eventsPerSecond = useMemo(() => telemetryEvents.filter((eventAt) => eventAt > Date.now() - 1000).length, [telemetryEvents]);
  const streaming = deviceList.filter((device) => device.online && now - device.lastSeen < 5000).length;
  const openAlerts = incidents.filter((incident) => incident.riskScore >= 60).length;
  const latestProof = batches[0] ? `#${batches[0].sequence}` : "pending";

  return (
    <aside className="grid min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden">
      <div className="command-panel rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--verified-green)]">
          <RadioTower size={17} /> Custody Swarm
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <AnimatedMetric label="Live witnesses" value={deviceList.length} accent="var(--verified-green)" />
          <AnimatedMetric label="Streaming" value={streaming} accent="var(--chain-blue)" />
          <AnimatedMetric label="Encrypted events" value={telemetryEvents.length} />
          <AnimatedMetric label="Events / sec" value={eventsPerSecond} accent="var(--chain-blue)" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AnimatedMetric label="Open alerts" value={openAlerts} accent={openAlerts ? "var(--tamper-red)" : "var(--verified-green)"} />
        <AnimatedMetric label="Latest proof" value={latestProof} accent="var(--monad-purple-soft)" />
      </div>

      <div className="command-panel min-h-0 overflow-hidden rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--warning-amber)]">
          <AlertTriangle size={17} /> At-Risk Witnesses
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

      <div className="command-panel rounded-lg p-4 text-xs text-[var(--text-secondary)]">
        <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--chain-blue)]">
          <LockKeyhole size={15} /> Privacy Anchor
        </div>
        <div>Raw GPS, temperature, battery, and device identity stay encrypted off-chain.</div>
        <div className="mt-2 flex items-center gap-2 font-semibold text-[var(--monad-purple-soft)]">
          <Boxes size={15} /> {batches[0] ? `Latest batch root ${batches[0].merkleRoot.slice(0, 10)}...` : "Waiting for first evidence root"}
        </div>
      </div>
    </aside>
  );
}
