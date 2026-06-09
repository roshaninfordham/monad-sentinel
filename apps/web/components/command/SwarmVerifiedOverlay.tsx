"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useSentinelStore } from "@/lib/store/sentinelStore";

export function SwarmVerifiedOverlay() {
  const show = useSentinelStore((state) => state.swarmOverlay);
  const devices = Object.keys(useSentinelStore((state) => state.devices)).length;
  const hide = useSentinelStore((state) => state.hideSwarmOverlay);

  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(hide, 1600);
    return () => window.clearTimeout(id);
  }, [show, hide]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(5,2,10,.62)] backdrop-blur-md"
        >
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-5 size-24 text-[var(--verified-green)] drop-shadow-[0_0_28px_rgba(37,243,132,.55)]" />
            <div className="text-5xl font-semibold">{devices} custody witnesses live</div>
            <div className="mt-3 text-lg text-[var(--text-secondary)]">Signed telemetry streaming</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
