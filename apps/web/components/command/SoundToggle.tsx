"use client";

import { Volume2, VolumeX } from "lucide-react";
import { SoundEngine } from "@/lib/sound/SoundEngine";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function SoundToggle() {
  const enabled = useSentinelStore((state) => state.soundEnabled);
  const setSoundEnabled = useSentinelStore((state) => state.setSoundEnabled);

  async function toggle() {
    if (!enabled) {
      await SoundEngine.initFromUserGesture();
      setSoundEnabled(true);
      SoundEngine.playVerified();
    } else {
      SoundEngine.setEnabled(false);
      setSoundEnabled(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--monad-purple)]"
    >
      {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      {enabled ? "Sound On" : "Enable Sound"}
    </button>
  );
}
