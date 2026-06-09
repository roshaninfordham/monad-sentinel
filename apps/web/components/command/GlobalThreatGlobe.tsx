"use client";

import { motion } from "framer-motion";
import { LiveDevice } from "@monad-sentinel/shared";

export function GlobalThreatGlobe({ devices }: { devices: LiveDevice[] }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(76,201,240,.13),rgba(5,2,10,.95)_65%)]">
      <div className="relative size-[min(72vh,72vw)] max-h-[560px] max-w-[560px] rounded-full border border-[rgba(76,201,240,.28)] bg-[radial-gradient(circle_at_38%_32%,rgba(169,139,255,.36),rgba(11,6,20,.96)_54%,rgba(5,2,10,1))] shadow-[0_0_60px_rgba(76,201,240,.18)]">
        <div className="absolute inset-8 rounded-full border border-[rgba(131,110,249,.18)]" />
        <div className="absolute inset-16 rounded-full border border-[rgba(37,243,132,.14)]" />
        <motion.div
          className="absolute left-[18%] top-[54%] h-[2px] w-[64%] origin-left rounded-full bg-[linear-gradient(90deg,var(--verified-green),var(--monad-purple),var(--tamper-red))]"
          animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
        />
        {devices.slice(0, 28).map((device, index) => {
          const angle = (index / 28) * Math.PI * 2;
          const x = 50 + Math.cos(angle) * 34;
          const y = 50 + Math.sin(angle) * 24;
          return (
            <span
              key={device.id}
              className="absolute size-2 rounded-full shadow-[0_0_14px_currentColor]"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                color: device.riskScore >= 70 ? "var(--tamper-red)" : "var(--verified-green)",
                background: "currentColor"
              }}
            />
          );
        })}
      </div>
      <div className="absolute left-4 top-4 rounded-md border border-[rgba(76,201,240,.24)] bg-black/45 px-3 py-2 text-xs text-[var(--chain-blue)] backdrop-blur">
        Global Threat View · simulated high-value route
      </div>
    </div>
  );
}
