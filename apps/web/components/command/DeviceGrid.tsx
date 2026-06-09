"use client";

import { Smartphone, Tablet, Monitor, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { useSentinelStore } from "@/lib/store/sentinelStore";
import { shortHash } from "@monad-sentinel/shared";

function DeviceIcon({ type }: { type: string }) {
  if (type === "tablet") return <Tablet size={15} />;
  if (type === "desktop") return <Monitor size={15} />;
  return <Smartphone size={15} />;
}

export function DeviceGrid() {
  const devicesById = useSentinelStore((state) => state.devices);
  const selectedDeviceId = useSentinelStore((state) => state.demoRoute.selectedDeviceId);
  const selectDevice = useSentinelStore((state) => state.selectDevice);
  const devices = useMemo(() => Object.values(devicesById), [devicesById]);
  return (
    <div className="panel max-h-[28vh] overflow-hidden rounded-lg p-4">
      <div className="mb-3 text-sm font-semibold">Live Evidence Log</div>
      <div className="space-y-2 overflow-y-auto pr-1">
        {devices.slice(0, 9).map((device) => (
          <button
            key={device.id}
            type="button"
            onClick={() => selectDevice(device.id)}
            className={
              selectedDeviceId === device.id
                ? "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-[rgba(37,243,132,.34)] bg-[rgba(37,243,132,.08)] px-3 py-2 text-left"
                : "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-left"
            }
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <DeviceIcon type={device.deviceClass} />
                <span className="truncate">{device.alias}</span>
              </div>
              <div className="hash mt-1 truncate text-[11px] text-[var(--text-secondary)]">{shortHash(device.payloadHash)}</div>
            </div>
            <div className="text-right text-[11px] text-[var(--text-secondary)]">
              <div className="inline-flex items-center gap-1 text-[var(--verified-green)]">
                <CheckCircle2 size={12} /> {device.verification}
              </div>
              <div>{device.accuracyM ? `${device.accuracyM}m GPS` : "spatialized"}</div>
            </div>
          </button>
        ))}
        {!devices.length && <div className="text-sm text-[var(--text-secondary)]">No witnesses connected.</div>}
      </div>
    </div>
  );
}
