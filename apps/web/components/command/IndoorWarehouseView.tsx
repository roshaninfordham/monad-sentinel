"use client";

import { motion } from "framer-motion";
import { Boxes, Flag, Route, Thermometer, Zap } from "lucide-react";
import { useMemo } from "react";
import { LiveDevice } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

const ROUTE_POINTS = [
  { x: 18, y: 67 },
  { x: 29, y: 59 },
  { x: 42, y: 57 },
  { x: 56, y: 49 },
  { x: 72, y: 42 },
  { x: 84, y: 35 }
];
const DEVIATION_POINT = { x: 66, y: 70 };
const AUTHORIZED_STOP_POINT = { x: 43, y: 57 };
const DESTINATION_POINT = ROUTE_POINTS[ROUTE_POINTS.length - 1];

function nodeColor(device: LiveDevice) {
  if (device.riskScore >= 70) return "var(--tamper-red)";
  if (device.riskScore >= 30) return "var(--warning-amber)";
  if (device.verification === "Verified") return "var(--verified-green)";
  return "var(--chain-blue)";
}

export function IndoorWarehouseView({ devices, latestAlertId }: { devices: LiveDevice[]; latestAlertId?: string }) {
  const demoRoute = useSentinelStore((state) => state.demoRoute);
  const selectDevice = useSentinelStore((state) => state.selectDevice);

  const activeRoutePoint = useMemo(() => {
    if (demoRoute.stage === "deviation") return DEVIATION_POINT;
    if (demoRoute.stage === "authorized_stop") return AUTHORIZED_STOP_POINT;
    if (demoRoute.stage === "delivery") return DESTINATION_POINT;
    return interpolateScreenRoute(demoRoute.progress);
  }, [demoRoute.progress, demoRoute.stage]);

  const plotted = useMemo(() => {
    return devices.map((device, index) => {
      if (device.id === demoRoute.selectedDeviceId && demoRoute.stage !== "idle") {
        return {
          device,
          x: activeRoutePoint.x,
          y: activeRoutePoint.y
        };
      }
      const angle = (index / Math.max(devices.length, 1)) * Math.PI * 2 + (index % 5) * 0.17;
      const ring = 34 + (index % 4) * 10;
      return {
        device,
        x: 50 + Math.cos(angle) * ring,
        y: 52 + Math.sin(angle) * ring * 0.48
      };
    });
  }, [activeRoutePoint, demoRoute.selectedDeviceId, demoRoute.stage, devices]);

  const routeLabel = routeStateLabel(demoRoute.stage, demoRoute.deviationM);

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
      <svg className="pointer-events-none absolute inset-0 z-[2]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={routePath(ROUTE_POINTS)} fill="none" stroke="rgba(37,243,132,.14)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={routePath(ROUTE_POINTS)}
          fill="none"
          stroke="rgba(37,243,132,.64)"
          strokeWidth="1.4"
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: "route-dash 12s linear infinite" }}
        />
        <path d={routePath(progressRoutePoints(demoRoute.progress, activeRoutePoint, demoRoute.stage))} fill="none" stroke="rgba(76,201,240,.78)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        {demoRoute.stage === "deviation" && (
          <path
            d={`M 56 49 L ${DEVIATION_POINT.x} ${DEVIATION_POINT.y}`}
            fill="none"
            stroke="rgba(255,59,92,.88)"
            strokeWidth="2.3"
            strokeDasharray="2 2"
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,59,92,.65))" }}
          />
        )}
        <circle cx={AUTHORIZED_STOP_POINT.x} cy={AUTHORIZED_STOP_POINT.y} r="4.8" fill="rgba(37,243,132,.08)" stroke="rgba(37,243,132,.58)" strokeWidth="0.8" />
        <circle cx={DESTINATION_POINT.x} cy={DESTINATION_POINT.y} r="7.5" fill="rgba(131,110,249,.12)" stroke="rgba(169,139,255,.72)" strokeWidth="1" />
        <motion.circle
          key={`${demoRoute.stage}-${demoRoute.updatedAt}`}
          cx={activeRoutePoint.x}
          cy={activeRoutePoint.y}
          r={demoRoute.stage === "deviation" ? 6 : 3.8}
          fill={demoRoute.stage === "deviation" ? "rgba(255,59,92,.22)" : "rgba(76,201,240,.18)"}
          stroke={demoRoute.stage === "deviation" ? "rgba(255,59,92,.94)" : "rgba(76,201,240,.9)"}
          strokeWidth="1"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.26 }}
        />
      </svg>
      <div
        className="pointer-events-none absolute z-[7] -translate-x-1/2 rounded-md border border-white/10 bg-black/60 px-2.5 py-1.5 text-[10px] text-[var(--text-primary)] shadow-[0_0_18px_rgba(76,201,240,.2)] backdrop-blur"
        style={{ left: `${activeRoutePoint.x}%`, top: `${Math.max(activeRoutePoint.y - 9, 12)}%` }}
      >
        <div className="uppercase tracking-[0.14em] text-[var(--chain-blue)]">{routeLabel.title}</div>
        <div className="mt-0.5 text-[var(--text-secondary)]">{routeLabel.detail}</div>
      </div>
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
        <motion.button
          key={device.id}
          type="button"
          aria-label={`Inspect ${device.alias}`}
          onClick={() => selectDevice(device.id)}
          initial={{ opacity: 0, scale: 0.2, y: -18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--verified-green)]"
          style={{ left: `${x}%`, top: `${y}%`, color: nodeColor(device) }}
        >
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <span className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" style={{ background: nodeColor(device), animation: "pulse-ring 1.8s ease-out infinite" }} />
            <span className="block size-4 rounded-full border border-white/40 shadow-[0_0_18px_currentColor]" style={{ background: nodeColor(device) }} />
            {demoRoute.selectedDeviceId === device.id && (
              <span className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--verified-green)] shadow-[0_0_22px_rgba(37,243,132,.38)]" />
            )}
            {(device.riskScore >= 70 || latestAlertId === device.id) && (
              <span className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--tamper-red)]" style={{ animation: "tamper-ripple 1.25s ease-out infinite" }} />
            )}
            <div className="absolute left-5 top-[-10px] hidden min-w-[118px] rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-[var(--text-primary)] backdrop-blur md:block">
              <div className="truncate">{device.alias}</div>
              <div className="text-[var(--text-secondary)]">{device.deviceClass} · risk {device.riskScore}</div>
            </div>
          </div>
        </motion.button>
      ))}
      <div className="absolute bottom-4 left-4 z-10 grid grid-cols-3 gap-2">
        <ViewportChip icon={<Route size={13} />} label="Corridor" value={`${demoRoute.thresholdM}m`} tone={demoRoute.stage === "deviation" ? "var(--tamper-red)" : "var(--verified-green)"} />
        <ViewportChip icon={<Flag size={13} />} label="Destination" value={demoRoute.delivered ? "arrived" : "pending"} tone={demoRoute.delivered ? "var(--verified-green)" : "var(--monad-purple-soft)"} />
        <ViewportChip icon={<Zap size={13} />} label="Motion" value="signed" tone="var(--verified-green)" />
        <ViewportChip icon={<Thermometer size={13} />} label="Cold" value="simulated" tone="var(--warning-amber)" />
        <ViewportChip icon={<Boxes size={13} />} label="Cargo" value="sealed" tone="var(--chain-blue)" />
      </div>
    </div>
  );
}

function interpolateScreenRoute(progress: number) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const scaled = clamped * (ROUTE_POINTS.length - 1);
  const index = Math.min(Math.floor(scaled), ROUTE_POINTS.length - 2);
  const local = scaled - index;
  const from = ROUTE_POINTS[index];
  const to = ROUTE_POINTS[index + 1];
  return {
    x: from.x + (to.x - from.x) * local,
    y: from.y + (to.y - from.y) * local
  };
}

function routePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function progressRoutePoints(progress: number, activePoint: { x: number; y: number }, stage: string) {
  if (stage === "idle") return [ROUTE_POINTS[0], activePoint];
  if (stage === "deviation") return [...ROUTE_POINTS.slice(0, 4), activePoint];
  const count = Math.max(1, Math.ceil(progress * (ROUTE_POINTS.length - 1)));
  return [...ROUTE_POINTS.slice(0, count), activePoint];
}

function routeStateLabel(stage: string, deviationM: number) {
  if (stage === "deviation") return { title: "Deviation", detail: `+${deviationM || 42}m past corridor` };
  if (stage === "authorized_stop") return { title: "Approved stop", detail: "checkpoint dwell" };
  if (stage === "delivery") return { title: "Destination", detail: "geofence entered" };
  if (stage === "movement") return { title: "Moving", detail: "inside route corridor" };
  return { title: "Demo route", detail: "ready for movement" };
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
