"use client";

import { Play, RotateCcw, ShieldAlert, Users } from "lucide-react";
import { SoundEngine } from "@/lib/sound/SoundEngine";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function DemoControls({ sessionId }: { sessionId: string }) {
  const spawnSimulatedDevices = useSentinelStore((state) => state.spawnSimulatedDevices);
  const triggerRandomTamper = useSentinelStore((state) => state.triggerRandomTamper);
  const commitBatch = useSentinelStore((state) => state.commitBatch);
  const reset = useSentinelStore((state) => state.reset);
  const soundEnabled = useSentinelStore((state) => state.soundEnabled);

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

  function batch() {
    const committed = commitBatch();
    if (committed && soundEnabled) SoundEngine.playBatchCommitted();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={spawn} className="inline-flex items-center gap-2 rounded-md bg-[var(--verified-green)] px-3 py-2 text-sm font-semibold text-black">
        <Users size={16} /> Spawn 50
      </button>
      <button onClick={tamper} className="inline-flex items-center gap-2 rounded-md bg-[var(--tamper-red)] px-3 py-2 text-sm font-semibold text-white">
        <ShieldAlert size={16} /> Trigger theft
      </button>
      <button onClick={batch} className="inline-flex items-center gap-2 rounded-md bg-[var(--monad-purple)] px-3 py-2 text-sm font-semibold text-white">
        <Play size={16} /> Commit batch
      </button>
      <button onClick={reset} className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <RotateCcw size={16} /> Reset
      </button>
    </div>
  );
}
