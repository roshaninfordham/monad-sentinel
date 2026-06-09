"use client";

import { useEffect, useRef } from "react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { ConfirmationProgress } from "@/components/command/ConfirmationProgress";
import { CustodyViewport } from "@/components/command/CustodyViewport";
import { DemoControls } from "@/components/command/DemoControls";
import { DeviceDetailPanel } from "@/components/command/DeviceDetailPanel";
import { EvidenceRail } from "@/components/command/EvidenceRail";
import { IncidentFeed } from "@/components/command/IncidentFeed";
import { LiveEvidenceLog } from "@/components/command/LiveEvidenceLog";
import { MetricsRail } from "@/components/command/MetricsRail";
import { SessionQRCode } from "@/components/command/SessionQRCode";
import { SoundToggle } from "@/components/command/SoundToggle";
import { SwarmVerifiedOverlay } from "@/components/command/SwarmVerifiedOverlay";
import { TopStatusBar } from "@/components/command/TopStatusBar";
import { SoundEngine } from "@/lib/sound/SoundEngine";
import { useSentinelStore } from "@/lib/store/sentinelStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function DashboardClient({ sessionId }: { sessionId: string }) {
  const commitBatch = useSentinelStore((state) => state.commitBatch);
  const receiveBatch = useSentinelStore((state) => state.receiveBatch);
  const soundEnabled = useSentinelStore((state) => state.soundEnabled);
  const deviceCount = useSentinelStore((state) => Object.keys(state.devices).length);
  const lastAutoCommitCursor = useRef("");

  useEffect(() => {
    let inFlight = false;
    const id = window.setInterval(() => {
      if (inFlight) return;
      const snapshot = useSentinelStore.getState();
      const devices = Object.values(snapshot.devices);
      const evidenceCursor = [
        devices.length,
        devices.reduce((total, device) => total + device.seq + device.riskScore + device.riskFlags, 0),
        snapshot.incidents.length,
        snapshot.telemetryEvents.length
      ].join(":");
      if (devices.length > 0 && evidenceCursor !== lastAutoCommitCursor.current) {
        lastAutoCommitCursor.current = evidenceCursor;
        inFlight = true;
        fetch("/api/chain/emergency-commit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId })
        })
          .then((response) => {
            if (!response.ok) throw new Error("commit-backend-unavailable");
            return response.json();
          })
          .then((body) => {
            if (body?.batch) {
              receiveBatch({
                sequence: Number(body.batch.sequence),
                merkleRoot: body.batch.merkleRoot,
                sampleCount: Number(body.batch.sampleCount),
                maxRiskScore: Number(body.batch.maxRiskScore),
                flags: Number(body.batch.combinedFlags ?? 0),
                txHash: body.batch.txHash,
                status: "verified",
                createdAt: Date.now(),
                simulated: Boolean(body.batch.simulated)
              });
              if (useSentinelStore.getState().soundEnabled) SoundEngine.playBatchCommitted();
            } else {
              const batch = commitBatch();
              if (batch && useSentinelStore.getState().soundEnabled) SoundEngine.playBatchCommitted();
            }
          })
          .catch(() => {
            const batch = commitBatch();
            if (batch && useSentinelStore.getState().soundEnabled) SoundEngine.playBatchCommitted();
          })
          .finally(() => {
            inFlight = false;
          });
      }
    }, 2400);
    return () => window.clearInterval(id);
  }, [commitBatch, receiveBatch, sessionId]);

  useEffect(() => {
    if (soundEnabled && deviceCount) SoundEngine.playVerified();
  }, [deviceCount, soundEnabled]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    fetch(`/api/session/${sessionId}/latest`)
      .then((response) => (response.ok ? response.json() : null))
      .then((snapshot) => {
        if (snapshot) useSentinelStore.getState().hydrateSnapshot(snapshot);
      })
      .catch(() => {
        // Realtime still works when snapshot hydration is unavailable.
      });

    if (!supabase) return;
    const telemetryChannel = supabase
      .channel(`session:${sessionId}:telemetry`)
      .on("broadcast", { event: "device.joined" }, ({ payload }) => {
        const device = payload?.device;
        if (!device?.id) return;
        useSentinelStore.getState().addRealtimeDevice({
          id: device.id,
          alias: device.alias,
          deviceClass: device.deviceClass ?? "unknown",
          latestRiskScore: device.latestRiskScore,
          latestRiskFlags: device.latestRiskFlags
        });
        if (useSentinelStore.getState().soundEnabled) SoundEngine.playJoin();
      })
      .on("broadcast", { event: "simulate.devices" }, ({ payload }) => {
        for (const event of payload?.events ?? []) {
          const device = event.device;
          if (device?.id) {
            useSentinelStore.getState().addRealtimeDevice({
              id: device.id,
              alias: device.alias,
              deviceClass: device.deviceClass ?? "unknown",
              latestRiskScore: device.latestRiskScore,
              latestRiskFlags: device.latestRiskFlags
            });
          }
        }
      })
      .subscribe();

    const chainChannel = supabase
      .channel(`session:${sessionId}:chain`)
      .on("broadcast", { event: "chain.batch.committed" }, ({ payload }) => {
        const batch = payload?.batch;
        if (!batch) return;
        useSentinelStore.getState().receiveBatch({
          sequence: Number(batch.sequence),
          merkleRoot: batch.merkleRoot,
          sampleCount: Number(batch.sampleCount),
          maxRiskScore: Number(batch.maxRiskScore),
          flags: Number(batch.combinedFlags ?? 0),
          txHash: batch.txHash,
          status: "verified",
          createdAt: Date.now(),
          simulated: Boolean(batch.simulated)
        });
        if (useSentinelStore.getState().soundEnabled) SoundEngine.playBatchCommitted();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(telemetryChannel);
      supabase.removeChannel(chainChannel);
    };
  }, [sessionId]);

  return (
    <main className="relative h-[100dvh] overflow-hidden">
      <BackgroundGrid />
      <SwarmVerifiedOverlay />
      <div className="dashboard-shell">
        <TopStatusBar sessionId={sessionId} />
        <section className="dashboard-grid" data-dashboard-grid>
          <div className="dashboard-left">
            <MetricsRail />
            <LiveEvidenceLog />
          </div>
          <div className="dashboard-center">
            <CustodyViewport />
            <ConfirmationProgress />
          </div>
          <aside className="dashboard-right">
            <div className="command-panel rounded-lg p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Presenter Console</div>
                  <div className="text-xs text-[var(--text-secondary)]">Simulation and demo controls</div>
                </div>
                <SoundToggle />
              </div>
              <DemoControls sessionId={sessionId} />
            </div>
            <SessionQRCode sessionId={sessionId} />
            <div className="dashboard-right-bottom">
              <IncidentFeed />
              <DeviceDetailPanel sessionId={sessionId} />
            </div>
          </aside>
        </section>
        <EvidenceRail sessionId={sessionId} />
      </div>
    </main>
  );
}
