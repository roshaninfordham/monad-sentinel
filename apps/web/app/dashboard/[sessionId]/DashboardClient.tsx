"use client";

import { useEffect } from "react";
import { BackgroundGrid } from "@/components/command/BackgroundGrid";
import { CustodyMap } from "@/components/command/CustodyMap";
import { DemoControls } from "@/components/command/DemoControls";
import { DeviceGrid } from "@/components/command/DeviceGrid";
import { EvidenceRail } from "@/components/command/EvidenceRail";
import { IncidentFeed } from "@/components/command/IncidentFeed";
import { MetricsRail } from "@/components/command/MetricsRail";
import { SessionQRCode } from "@/components/command/SessionQRCode";
import { SoundToggle } from "@/components/command/SoundToggle";
import { SwarmVerifiedOverlay } from "@/components/command/SwarmVerifiedOverlay";
import { SoundEngine } from "@/lib/sound/SoundEngine";
import { useSentinelStore } from "@/lib/store/sentinelStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function DashboardClient({ sessionId }: { sessionId: string }) {
  const commitBatch = useSentinelStore((state) => state.commitBatch);
  const soundEnabled = useSentinelStore((state) => state.soundEnabled);
  const deviceCount = useSentinelStore((state) => Object.keys(state.devices).length);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Object.keys(useSentinelStore.getState().devices).length > 0) {
        const batch = commitBatch();
        if (batch && useSentinelStore.getState().soundEnabled) SoundEngine.playBatchCommitted();
      }
    }, 2400);
    return () => window.clearInterval(id);
  }, [commitBatch]);

  useEffect(() => {
    if (soundEnabled && deviceCount) SoundEngine.playVerified();
  }, [deviceCount, soundEnabled]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
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
    <main className="relative h-screen overflow-hidden">
      <BackgroundGrid />
      <SwarmVerifiedOverlay />
      <div className="relative z-10 grid h-full grid-rows-[auto_1fr_auto] gap-3 p-3">
        <header className="panel flex items-center justify-between gap-4 rounded-lg px-4 py-3">
          <div>
            <div className="text-xl font-semibold">Monad Sentinel</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Live Proof-of-Custody Swarm · Session {sessionId}</div>
          </div>
          <div className="flex items-center gap-3">
            <SoundToggle />
            <DemoControls sessionId={sessionId} />
          </div>
        </header>
        <section className="grid min-h-0 grid-cols-[320px_1fr_290px] gap-3">
          <MetricsRail />
          <CustodyMap />
          <aside className="flex min-h-0 flex-col gap-3">
            <SessionQRCode sessionId={sessionId} />
            <IncidentFeed />
            <DeviceGrid />
          </aside>
        </section>
        <EvidenceRail sessionId={sessionId} />
      </div>
    </main>
  );
}
