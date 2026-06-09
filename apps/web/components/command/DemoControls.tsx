"use client";

import { Copy, ExternalLink, Play, RotateCcw, ShieldAlert, Thermometer, Users } from "lucide-react";
import { getAppUrl } from "@/lib/session";
import { SoundEngine } from "@/lib/sound/SoundEngine";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function DemoControls({ sessionId }: { sessionId: string }) {
  const spawnSimulatedDevices = useSentinelStore((state) => state.spawnSimulatedDevices);
  const triggerRandomTamper = useSentinelStore((state) => state.triggerRandomTamper);
  const triggerColdChainBreach = useSentinelStore((state) => state.triggerColdChainBreach);
  const commitBatch = useSentinelStore((state) => state.commitBatch);
  const reset = useSentinelStore((state) => state.reset);
  const soundEnabled = useSentinelStore((state) => state.soundEnabled);
  const latestBatch = useSentinelStore((state) => state.batches[0]);

  function spawn() {
    spawnSimulatedDevices(50, sessionId);
    if (soundEnabled) {
      SoundEngine.playJoin();
      window.setTimeout(() => SoundEngine.playSwarmComplete(), 260);
    }
  }

  function tamper() {
    const incident = triggerRandomTamper();
    if (incident && soundEnabled) SoundEngine.playTamper();
  }

  function coldChain() {
    const incident = triggerColdChainBreach();
    if (incident && soundEnabled) SoundEngine.playTamper();
  }

  function batch() {
    const committed = commitBatch();
    if (committed && soundEnabled) SoundEngine.playBatchCommitted();
  }

  function copyJoinUrl() {
    navigator.clipboard.writeText(`${getAppUrl()}/s/${sessionId}`);
  }

  function openLatestReceipt() {
    if (!latestBatch) return;
    window.open(`/receipt/${sessionId}/${latestBatch.sequence}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button onClick={spawn} className="control-button border-[rgba(37,243,132,.34)] bg-[rgba(37,243,132,.12)] text-[var(--verified-green)]">
        <Users size={16} /> Spawn 50
      </button>
      <button onClick={tamper} className="control-button border-[rgba(255,59,92,.34)] bg-[rgba(255,59,92,.13)] text-[var(--tamper-red)]">
        <ShieldAlert size={16} /> Trigger theft
      </button>
      <button onClick={coldChain} className="control-button border-[rgba(255,176,32,.34)] bg-[rgba(255,176,32,.12)] text-[var(--warning-amber)]">
        <Thermometer size={16} /> Cold breach
      </button>
      <button onClick={batch} className="control-button border-[rgba(131,110,249,.38)] bg-[rgba(131,110,249,.16)] text-[var(--monad-purple-soft)]">
        <Play size={16} /> Emergency batch
      </button>
      <button onClick={copyJoinUrl} className="control-button">
        <Copy size={16} /> Copy join
      </button>
      <button onClick={openLatestReceipt} disabled={!latestBatch} className="control-button disabled:cursor-not-allowed disabled:opacity-40">
        <ExternalLink size={16} /> Latest receipt
      </button>
      <button onClick={reset} className="control-button">
        <RotateCcw size={16} /> Reset
      </button>
    </div>
  );
}
