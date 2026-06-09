"use client";

import { create } from "zustand";
import {
  buildMerkleRoot,
  EvidenceBatch,
  hashPayload,
  Incident,
  LiveDevice,
  scoreRisk,
  TelemetryPayload
} from "@monad-sentinel/shared";
import { makeTxHash } from "@/lib/session";

type SentinelState = {
  devices: Record<string, LiveDevice>;
  incidents: Incident[];
  batches: EvidenceBatch[];
  latestTx?: string;
  telemetryEvents: number[];
  soundEnabled: boolean;
  swarmOverlay: boolean;
  indoorSpatialization: boolean;
  viewportMode: "indoor" | "geo" | "globe";
  addDevice: (device: LiveDevice) => void;
  addRealtimeDevice: (device: {
    id: string;
    alias: string;
    deviceClass: "mobile" | "tablet" | "desktop" | "unknown";
    latestRiskScore?: number;
    latestRiskFlags?: number;
  }) => void;
  ingestTelemetry: (payload: TelemetryPayload, manualAlert?: boolean) => Incident | null;
  spawnSimulatedDevices: (count: number, sessionId: string) => void;
  triggerRandomTamper: () => Incident | null;
  triggerColdChainBreach: () => Incident | null;
  commitBatch: () => EvidenceBatch | null;
  receiveBatch: (batch: EvidenceBatch) => void;
  reset: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setIndoorSpatialization: (enabled: boolean) => void;
  setViewportMode: (mode: "indoor" | "geo" | "globe") => void;
  hideSwarmOverlay: () => void;
};

const WAREHOUSE = { lat: 40.74844, lng: -73.98566 };

function simulatedPayload(sessionId: string, index: number, device?: LiveDevice, tamper = false): TelemetryPayload {
  const angle = index * 0.72 + Date.now() / 24000;
  const radius = 0.00055 + (index % 5) * 0.00008;
  const lat = (device?.lat ?? WAREHOUSE.lat) + Math.sin(angle) * 0.000018;
  const lng = (device?.lng ?? WAREHOUSE.lng) + Math.cos(angle) * 0.000018;
  return {
    version: 1,
    sessionId,
    deviceId: device?.id ?? `sim-${index + 1}`,
    deviceAddress: `0x${(index + 11).toString(16).padStart(40, "0")}`,
    seq: (device?.seq ?? 0) + 1,
    capturedAt: Date.now(),
    latE7: Math.round((device ? lat : WAREHOUSE.lat + Math.sin(angle) * radius) * 1e7),
    lngE7: Math.round((device ? lng : WAREHOUSE.lng + Math.cos(angle) * radius) * 1e7),
    accuracyCm: 600 + (index % 8) * 80,
    accelX: tamper ? 24 + Math.random() * 8 : Math.random() * 2,
    accelY: tamper ? 16 + Math.random() * 5 : Math.random() * 2,
    accelZ: tamper ? 12 + Math.random() * 3 : 9.8 + Math.random(),
    batteryPct: 35 + ((index * 7) % 60),
    charging: index % 3 === 0,
    deviceClass: index % 9 === 0 ? "tablet" : "mobile",
    browserHints: {
      platform: "demo",
      touch: true,
      screenW: 390,
      screenH: 844
    },
    riskFlags: tamper ? 128 : 0,
    previousPayloadHash: device?.payloadHash
  };
}

function aliasFor(id: string, count: number) {
  if (id.startsWith("sim-")) return `Mobile Witness #${id.replace("sim-", "")}`;
  return `Mobile Witness #${count + 1}`;
}

export const useSentinelStore = create<SentinelState>((set, get) => ({
  devices: {},
  incidents: [],
  batches: [],
  telemetryEvents: [],
  soundEnabled: false,
  swarmOverlay: false,
  indoorSpatialization: true,
  viewportMode: "indoor",

  addDevice: (device) =>
    set((state) => ({
      devices: { ...state.devices, [device.id]: device },
      swarmOverlay: Object.keys(state.devices).length + 1 >= 30 || state.swarmOverlay
    })),

  addRealtimeDevice: (device) =>
    set((state) => {
      const existing = state.devices[device.id];
      const index = Object.keys(state.devices).length + 1;
      const angle = index * 0.72;
      const lat = existing?.lat ?? WAREHOUSE.lat + Math.sin(angle) * 0.00055;
      const lng = existing?.lng ?? WAREHOUSE.lng + Math.cos(angle) * 0.00055;
      return {
        devices: {
          ...state.devices,
          [device.id]: {
            id: device.id,
            alias: existing?.alias ?? device.alias,
            deviceClass: device.deviceClass,
            lat,
            lng,
            accuracyM: existing?.accuracyM ?? null,
            batteryPct: existing?.batteryPct ?? null,
            online: true,
            lastSeen: Date.now(),
            joinedAt: existing?.joinedAt ?? Date.now(),
            seq: existing?.seq ?? 0,
            riskScore: device.latestRiskScore ?? existing?.riskScore ?? 0,
            riskFlags: device.latestRiskFlags ?? existing?.riskFlags ?? 0,
            verification: device.latestRiskScore && device.latestRiskScore >= 70 ? "Batched" : existing?.verification ?? "Live",
            payloadHash: existing?.payloadHash ?? `0x${"0".repeat(56)}${index.toString(16).padStart(8, "0")}`,
            txHash: existing?.txHash,
            trail: existing?.trail ?? [{ lat, lng, t: Date.now() }]
          }
        },
        swarmOverlay: Object.keys(state.devices).length + 1 >= 30 || state.swarmOverlay
      };
    }),

  ingestTelemetry: (payload, manualAlert) => {
    const state = get();
    const previous = state.devices[payload.deviceId];
    const payloadHash = hashPayload(payload);
    const lat = payload.latE7 ? payload.latE7 / 1e7 : WAREHOUSE.lat + Math.random() * 0.001;
    const lng = payload.lngE7 ? payload.lngE7 / 1e7 : WAREHOUSE.lng + Math.random() * 0.001;
    const risk = scoreRisk({ payload, previous, origin: WAREHOUSE, manualAlert });
    const trail = [...(previous?.trail ?? []), { lat, lng, t: payload.capturedAt }].slice(-20);
    const device: LiveDevice = {
      id: payload.deviceId,
      alias: previous?.alias ?? aliasFor(payload.deviceId, Object.keys(state.devices).length),
      deviceClass: payload.deviceClass,
      lat,
      lng,
      accuracyM: payload.accuracyCm ? Math.round(payload.accuracyCm / 100) : null,
      batteryPct: payload.batteryPct ?? null,
      online: true,
      lastSeen: Date.now(),
      joinedAt: previous?.joinedAt ?? Date.now(),
      seq: payload.seq,
      riskScore: risk.riskScore,
      riskFlags: risk.riskFlags,
      verification: risk.riskScore >= 70 ? "Batched" : "Signed",
      payloadHash,
      trail
    };
    const incident =
      risk.riskScore >= 70
        ? {
            id: crypto.randomUUID(),
            deviceId: device.id,
            alias: device.alias,
            riskScore: risk.riskScore,
            flags: risk.riskFlags,
            reason: `${risk.reason}. Evidence queued for Monad.`,
            payloadHash,
            createdAt: Date.now()
          }
        : null;

    set((current) => ({
      devices: { ...current.devices, [device.id]: device },
      incidents: incident ? [incident, ...current.incidents].slice(0, 12) : current.incidents,
      telemetryEvents: [...current.telemetryEvents, Date.now()].slice(-400),
      swarmOverlay: Object.keys(current.devices).length + 1 >= 30 || current.swarmOverlay
    }));
    return incident;
  },

  spawnSimulatedDevices: (count, sessionId) => {
    for (let i = 0; i < count; i += 1) {
      const payload = simulatedPayload(sessionId, i);
      get().ingestTelemetry(payload);
    }
  },

  triggerRandomTamper: () => {
    const devices = Object.values(get().devices);
    if (!devices.length) return null;
    const target = devices[Math.floor(Math.random() * devices.length)];
    const index = Number(target.id.replace(/\D/g, "")) || 1;
    return get().ingestTelemetry(simulatedPayload(target.payloadHash.slice(2, 10), index, target, true), true);
  },

  triggerColdChainBreach: () => {
    const devices = Object.values(get().devices);
    if (!devices.length) return null;
    const target = devices[Math.floor(Math.random() * devices.length)];
    const incident: Incident = {
      id: crypto.randomUUID(),
      deviceId: target.id,
      alias: target.alias,
      riskScore: 76,
      flags: target.riskFlags | 256,
      reason: "cold-chain simulation: cargo temperature exceeded safe threshold. Evidence queued for Monad.",
      payloadHash: target.payloadHash,
      createdAt: Date.now()
    };
    set((state) => ({
      incidents: [incident, ...state.incidents].slice(0, 12),
      devices: {
        ...state.devices,
        [target.id]: {
          ...target,
          riskScore: Math.max(target.riskScore, 76),
          riskFlags: target.riskFlags | 256,
          verification: "Batched"
        }
      }
    }));
    return incident;
  },

  commitBatch: () => {
    const devices = Object.values(get().devices);
    if (!devices.length) return null;
    const leaves = devices.slice(0, 200).map((device) => device.payloadHash);
    const sequence = get().batches.length + 1;
    const txHash = makeTxHash(`batch-${sequence}-${Date.now()}`);
    const batch: EvidenceBatch = {
      sequence,
      merkleRoot: buildMerkleRoot(leaves),
      sampleCount: leaves.length,
      maxRiskScore: Math.max(...devices.map((device) => device.riskScore), 0),
      flags: devices.reduce((acc, device) => acc | device.riskFlags, 0),
      txHash,
      status: "verified",
      createdAt: Date.now(),
      simulated: process.env.NEXT_PUBLIC_CHAIN_DISABLED !== "false"
    };
    set((state) => ({
      batches: [batch, ...state.batches.filter((item) => item.sequence !== batch.sequence)].slice(0, 10),
      latestTx: txHash,
      incidents: state.incidents.map((incident, index) =>
        index === 0 ? { ...incident, txHash, batchSequence: sequence, reason: incident.reason.replace("queued", "committed") } : incident
      ),
      devices: Object.fromEntries(
        Object.entries(state.devices).map(([id, device]) => [id, { ...device, txHash, verification: "Verified" }])
      )
    }));
    return batch;
  },

  receiveBatch: (batch) =>
    set((state) => ({
      batches: [batch, ...state.batches.filter((item) => item.sequence !== batch.sequence)].slice(0, 10),
      latestTx: batch.txHash,
      devices: Object.fromEntries(
        Object.entries(state.devices).map(([id, device]) => [id, { ...device, txHash: batch.txHash, verification: "Verified" }])
      )
    })),

  reset: () => set({ devices: {}, incidents: [], batches: [], latestTx: undefined, telemetryEvents: [], swarmOverlay: false, viewportMode: "indoor" }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setIndoorSpatialization: (enabled) => set({ indoorSpatialization: enabled }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  hideSwarmOverlay: () => set({ swarmOverlay: false })
}));
