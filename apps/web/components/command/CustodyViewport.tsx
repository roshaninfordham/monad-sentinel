"use client";

import { Map, Orbit, Warehouse } from "lucide-react";
import { useMemo } from "react";
import { useSentinelStore } from "@/lib/store/sentinelStore";
import { CustodyMap } from "./CustodyMap";
import { GlobalThreatGlobe } from "./GlobalThreatGlobe";
import { IndoorWarehouseView } from "./IndoorWarehouseView";

export function CustodyViewport() {
  const devicesById = useSentinelStore((state) => state.devices);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  const incidents = useSentinelStore((state) => state.incidents);
  const viewportMode = useSentinelStore((state) => state.viewportMode);
  const setViewportMode = useSentinelStore((state) => state.setViewportMode);
  const latestAlertId = incidents[0]?.deviceId;

  return (
    <div className="command-panel relative min-h-0 overflow-hidden rounded-lg">
      <div className="absolute left-4 top-4 z-20">
        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">3D Custody Viewport</div>
        <div className="flex gap-2">
          <ModeButton active={viewportMode === "indoor"} onClick={() => setViewportMode("indoor")} icon={<Warehouse size={14} />} label="Indoor" />
          <ModeButton active={viewportMode === "geo"} onClick={() => setViewportMode("geo")} icon={<Map size={14} />} label="Geo" />
          <ModeButton active={viewportMode === "globe"} onClick={() => setViewportMode("globe")} icon={<Orbit size={14} />} label="Globe" />
        </div>
      </div>
      {viewportMode === "indoor" && <IndoorWarehouseView devices={devices} latestAlertId={latestAlertId} />}
      {viewportMode === "geo" && <CustodyMap embedded />}
      {viewportMode === "globe" && <GlobalThreatGlobe devices={devices} />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent,rgba(5,2,10,.34)_70%,rgba(5,2,10,.92))]" />
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={active ? "control-button border-[rgba(37,243,132,.38)] bg-[rgba(37,243,132,.1)] text-[var(--verified-green)]" : "control-button"}
    >
      {icon}
      {label}
    </button>
  );
}
