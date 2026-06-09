"use client";

import { motion } from "framer-motion";
import { Boxes, Thermometer, Zap } from "lucide-react";
import { useMemo } from "react";
import { LiveDevice } from "@monad-sentinel/shared";

function nodeColor(device: LiveDevice) {
  if (device.riskScore >= 70) return "var(--tamper-red)";
  if (device.riskScore >= 30) return "var(--warning-amber)";
  if (device.verification === "Verified") return "var(--verified-green)";
  return "var(--chain-blue)";
}

export function IndoorWarehouseView({ devices, latestAlertId }: { devices: LiveDevice[]; latestAlertId?: string }) {
  const plotted = useMemo(() => {
    return devices.map((device, index) => {
      const angle = (index / Math.max(devices.length, 1)) * Math.PI * 2 + (index % 5) * 0.17;
      const ring = 34 + (index % 4) * 10;
      return {
        device,
        x: 50 + Math.cos(angle) * ring,
        y: 52 + Math.sin(angle) * ring * 0.48
      };
    });
  }, [devices]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(131,110,249,.22),rgba(5,2,10,.84)_58%,rgba(5,2,10,.98))]">
      <div
        className="absolute inset-x-[-20%] bottom-[-25%] h-[72%] opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(76,201,240,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(76,201,240,.18) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          transform: "perspective(520px) rotateX(62deg)",
          transformOrigin: "center bottom",
          animation: "floor-drift 3s linear infinite"
        }}
      />
      <div className="absolute left-1/2 top-[52%] h-[108px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[rgba(131,110,249,.48)] bg-[linear-gradient(135deg,rgba(131,110,249,.34),rgba(18,10,32,.9))] shadow-[0_0_42px_rgba(131,110,249,.32)]">
        <div className="absolute inset-x-4 top-4 h-3 rounded bg-[rgba(255,255,255,.12)]" />
        <div className="absolute inset-x-4 bottom-4 grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 rounded-sm bg-[rgba(5,2,10,.36)]" />
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-[rgba(37,243,132,.38)] bg-black/45 px-3 py-1 text-xs text-[var(--verified-green)]">
          <Boxes size={14} />
          Cargo seal live
        </div>
      </div>
      {plotted.map(({ device, x, y }) => (
        <motion.div
          key={device.id}
          initial={{ opacity: 0, scale: 0.2, y: -18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%`, color: nodeColor(device) }}
        >
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <span className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" style={{ background: nodeColor(device), animation: "pulse-ring 1.8s ease-out infinite" }} />
            <span className="block size-4 rounded-full border border-white/40 shadow-[0_0_18px_currentColor]" style={{ background: nodeColor(device) }} />
            {(device.riskScore >= 70 || latestAlertId === device.id) && (
              <span className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--tamper-red)]" style={{ animation: "tamper-ripple 1.25s ease-out infinite" }} />
            )}
            <div className="absolute left-5 top-[-10px] hidden min-w-[118px] rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-[var(--text-primary)] backdrop-blur md:block">
              <div className="truncate">{device.alias}</div>
              <div className="text-[var(--text-secondary)]">{device.deviceClass} · risk {device.riskScore}</div>
            </div>
          </div>
        </motion.div>
      ))}
      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-2">
        <ViewportChip icon={<Zap size={13} />} label="Motion" value="signed" tone="var(--verified-green)" />
        <ViewportChip icon={<Thermometer size={13} />} label="Cold chain" value="simulated" tone="var(--warning-amber)" />
        <ViewportChip icon={<Boxes size={13} />} label="Cargo" value="sealed" tone="var(--chain-blue)" />
      </div>
    </div>
  );
}

function ViewportChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: tone }}>
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xs text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
