"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BatteryMedium,
  Boxes,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LockKeyhole,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  Smartphone,
  Thermometer
} from "lucide-react";
import { RISK_FLAGS, shortHash } from "@monad-sentinel/shared";
import { useSentinelStore } from "@/lib/store/sentinelStore";

const flagLabels = Object.entries(RISK_FLAGS).map(([key, value]) => ({
  bit: value,
  label: key
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}));

function formatTime(value?: number) {
  if (!value) return "pending";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function formatDuration(ms: number) {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function riskTone(score: number) {
  if (score >= 70) return "text-[var(--tamper-red)]";
  if (score >= 30) return "text-[var(--warning-amber)]";
  return "text-[var(--verified-green)]";
}

function routeCopy(flags: number, stage: string) {
  if (flags & RISK_FLAGS.DELIVERY_CONFIRMED || stage === "delivery") {
    return {
      label: "Delivered checkpoint",
      detail: "Destination geofence and final condition evidence are ready for receipt.",
      tone: "text-[var(--verified-green)]"
    };
  }
  if (flags & (RISK_FLAGS.GEOFENCE_EXIT | RISK_FLAGS.UNAUTHORIZED_STOP | RISK_FLAGS.SEAL_BROKEN)) {
    return {
      label: "Route deviation",
      detail: "Witness crossed the approved corridor or produced a custody breach signal.",
      tone: "text-[var(--tamper-red)]"
    };
  }
  if (flags & (RISK_FLAGS.SHAKE_TAMPER | RISK_FLAGS.REPEATED_SHOCK | RISK_FLAGS.COLD_CHAIN_EXCURSION)) {
    return {
      label: "Condition review",
      detail: "Shock or thermal exposure was detected, but route context decides severity.",
      tone: "text-[var(--warning-amber)]"
    };
  }
  return {
    label: "On approved route",
    detail: "Telemetry is within the planned corridor and privacy-preserving evidence flow.",
    tone: "text-[var(--verified-green)]"
  };
}

function DetailStat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-2">
      <div className={`mb-1 flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.14em] ${tone ?? "text-[var(--text-secondary)]"}`}>
        {icon}
        {label}
      </div>
      <div className="truncate text-[0.82rem] font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export function DeviceDetailPanel({ sessionId }: { sessionId: string }) {
  const devicesById = useSentinelStore((state) => state.devices);
  const incidents = useSentinelStore((state) => state.incidents);
  const batches = useSentinelStore((state) => state.batches);
  const demoRoute = useSentinelStore((state) => state.demoRoute);
  const selectDevice = useSentinelStore((state) => state.selectDevice);

  const devices = useMemo(
    () =>
      Object.values(devicesById).sort((a, b) => {
        const riskDelta = b.riskScore - a.riskScore;
        if (riskDelta !== 0) return riskDelta;
        return b.lastSeen - a.lastSeen;
      }),
    [devicesById]
  );
  const selected = demoRoute.selectedDeviceId ? devicesById[demoRoute.selectedDeviceId] : undefined;
  const device = selected ?? devices[0];

  const deviceIncidents = useMemo(() => incidents.filter((incident) => incident.deviceId === device?.id), [device?.id, incidents]);
  const latestBatch = useMemo(() => {
    if (!device) return undefined;
    return batches.find((batch) => batch.txHash === device.txHash) ?? batches[0];
  }, [batches, device]);

  if (!device) {
    return (
      <section className="command-panel min-h-0 overflow-hidden rounded-lg p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Smartphone size={16} className="text-[var(--chain-blue)]" />
          Device Inspector
        </div>
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-[var(--text-secondary)]">
          Waiting for a witness. Spawn simulated devices or scan the QR to populate Source to destination history.
        </div>
      </section>
    );
  }

  const flags = flagLabels.filter((flag) => (device.riskFlags & flag.bit) !== 0).slice(0, 5);
  const route = routeCopy(device.riskFlags, demoRoute.stage);
  const progress = Math.round(Math.max(0.08, demoRoute.selectedDeviceId === device.id ? demoRoute.progress : Math.min(device.seq / 18, 0.86)) * 100);
  const lastSeenAge = formatDuration(Date.now() - device.lastSeen);

  const timeline = [
    {
      id: "joined",
      time: device.joinedAt,
      icon: <Radio size={13} />,
      label: "Source scan",
      detail: `${device.alias} provisioned as ${device.deviceClass} custody witness`,
      tone: "text-[var(--chain-blue)]"
    },
    ...device.trail.slice(-5).map((point, index, rows) => ({
      id: `trail-${point.t}-${index}`,
      time: point.t,
      icon: <MapPin size={13} />,
      label: index === rows.length - 1 ? "Current position" : "Telemetry accepted",
      detail: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} · seq ${Math.max(1, device.seq - rows.length + index + 1)}`,
      tone: "text-[var(--verified-green)]"
    })),
    ...deviceIncidents.slice(0, 3).map((incident) => ({
      id: `incident-${incident.id}`,
      time: incident.createdAt,
      icon: incident.flags & RISK_FLAGS.COLD_CHAIN_EXCURSION ? <Thermometer size={13} /> : <AlertTriangle size={13} />,
      label: incident.riskScore >= 80 ? "Likely theft signal" : incident.riskScore >= 60 ? "Mishandling risk" : "Shock event",
      detail: incident.reason,
      tone: incident.riskScore >= 70 ? "text-[var(--tamper-red)]" : "text-[var(--warning-amber)]"
    })),
    ...(latestBatch
      ? [
          {
            id: `batch-${latestBatch.sequence}`,
            time: latestBatch.createdAt,
            icon: <Boxes size={13} />,
            label: latestBatch.simulated ? "Simulated batch" : "Batch anchored",
            detail: `batch #${latestBatch.sequence} · ${latestBatch.sampleCount} leaves · root ${shortHash(latestBatch.merkleRoot, 4)}`,
            tone: latestBatch.simulated ? "text-[var(--warning-amber)]" : "text-[var(--monad-purple-soft)]"
          }
        ]
      : [])
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 9);
  const verifiedOnMonad = device.verification === "Verified";
  const verificationBadgeClass = verifiedOnMonad
    ? "border-[rgba(37,243,132,.22)] bg-[rgba(37,243,132,.08)] text-[var(--verified-green)]"
    : "border-[rgba(76,201,240,.24)] bg-[rgba(76,201,240,.08)] text-[var(--chain-blue)]";

  return (
    <section className="command-panel flex min-h-0 flex-col overflow-hidden rounded-lg p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone size={16} className="text-[var(--chain-blue)]" />
            Device Inspector
          </div>
          <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">Click any node, incident, or log row to inspect a witness.</div>
        </div>
        <span className={`rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.68rem] font-semibold ${riskTone(device.riskScore)}`}>
          Risk {device.riskScore}
        </span>
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {devices.slice(0, 8).map((item) => (
          <button
            key={item.id}
            onClick={() => selectDevice(item.id)}
            className={
              item.id === device.id
                ? "shrink-0 rounded-md border border-[rgba(37,243,132,.42)] bg-[rgba(37,243,132,.12)] px-2 py-1 text-left text-[0.68rem] text-[var(--verified-green)]"
                : "shrink-0 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-left text-[0.68rem] text-[var(--text-secondary)] hover:border-[rgba(180,120,255,.34)] hover:text-[var(--text-primary)]"
            }
          >
            {item.alias.replace("Mobile Witness ", "W")}
          </button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto pr-1">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[var(--text-primary)]">{device.alias}</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {device.deviceClass} · seq {device.seq} · last seen {lastSeenAge} ago
              </div>
            </div>
            <div className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[0.67rem] ${verificationBadgeClass}`}>
              {verifiedOnMonad ? <CheckCircle2 size={12} /> : <LockKeyhole size={12} />}
              {device.verification}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <DetailStat icon={<Activity size={12} />} label="Status" value={device.online ? "Streaming" : "Offline"} tone={device.online ? "text-[var(--verified-green)]" : "text-[var(--tamper-red)]"} />
            <DetailStat icon={<BatteryMedium size={12} />} label="Battery" value={device.batteryPct == null ? "Unavailable" : `${device.batteryPct}%`} />
            <DetailStat icon={<MapPin size={12} />} label="Accuracy" value={device.accuracyM ? `${device.accuracyM}m GPS` : "Indoor spatialized"} />
            <DetailStat icon={<ShieldCheck size={12} />} label="Payload" value={shortHash(device.payloadHash, 4)} tone="text-[var(--monad-purple-soft)]" />
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            <Route size={14} />
            Source to destination history
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[0.68rem] text-[var(--text-secondary)]">
            <span>Source</span>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--chain-blue),var(--verified-green))]" style={{ width: `${progress}%` }} />
            </div>
            <span>Destination</span>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <span className={`mt-0.5 size-2.5 shrink-0 rounded-full bg-current ${route.tone}`} />
            <div className="min-w-0">
              <div className={`text-sm font-semibold ${route.tone}`}>{route.label}</div>
              <div className="text-xs leading-5 text-[var(--text-secondary)]">{route.detail}</div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[0.68rem]">
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[var(--text-secondary)]">progress {progress}%</span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[var(--text-secondary)]">threshold {demoRoute.thresholdM}m</span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[var(--text-secondary)]">deviation {demoRoute.deviationM}m</span>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            <LockKeyhole size={14} />
            Privacy status
          </div>
          <div className="grid gap-1.5 text-[0.72rem] text-[var(--text-secondary)]">
            <div className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-2 py-1.5">
              <span>Raw route and condition data</span>
              <span className="text-[var(--warning-amber)]">encrypted off-chain</span>
            </div>
            <div className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-2 py-1.5">
              <span>Public proof material</span>
              <span className="text-[var(--monad-purple-soft)]">root + commitments only</span>
            </div>
            <div className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-2 py-1.5">
              <span>Auditor receipt</span>
              <span className="text-[var(--verified-green)]">selective reveal</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            <Clock3 size={14} />
            Timeline
          </div>
          <div className="space-y-2">
            {timeline.map((item) => (
              <div key={item.id} className="grid grid-cols-[52px_18px_1fr] gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2">
                <span className="hash text-[0.64rem] text-[var(--text-secondary)]">{formatTime(item.time)}</span>
                <span className={item.tone}>{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-[0.72rem] font-semibold text-[var(--text-primary)]">{item.label}</div>
                  <div className="line-clamp-2 text-[0.68rem] leading-4 text-[var(--text-secondary)]">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            <Boxes size={14} />
            Evidence links
          </div>
          <div className="grid gap-1.5 text-[0.72rem] text-[var(--text-secondary)]">
            <div className="hash truncate rounded border border-white/10 bg-black/20 px-2 py-1.5">payload {shortHash(device.payloadHash)}</div>
            <div className="hash truncate rounded border border-white/10 bg-black/20 px-2 py-1.5">
              batch {latestBatch ? `#${latestBatch.sequence} · ${shortHash(latestBatch.merkleRoot)}` : "pending"}
            </div>
            <div className="hash truncate rounded border border-white/10 bg-black/20 px-2 py-1.5">
              tx {latestBatch?.simulated ? "simulated local proof" : shortHash(latestBatch?.txHash)}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={`/shipment/${sessionId}?device=${encodeURIComponent(device.id)}`} className="control-button justify-center text-[0.72rem]">
              <Route size={14} />
              Journey
            </a>
            <a
              href={latestBatch ? `/receipt/${sessionId}/${latestBatch.sequence}` : "#"}
              aria-disabled={!latestBatch}
              className="control-button justify-center text-[0.72rem] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            >
              <ExternalLink size={14} />
              Receipt
            </a>
          </div>
        </div>

        {flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <span key={flag.label} className="rounded border border-[rgba(255,176,32,.26)] bg-[rgba(255,176,32,.08)] px-2 py-1 text-[0.66rem] text-[var(--warning-amber)]">
                {flag.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
