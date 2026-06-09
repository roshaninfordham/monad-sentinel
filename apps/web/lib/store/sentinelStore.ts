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
  triggerScenario: (scenario: "bump" | "mishandling" | "theft") => Incident | null;
  commitBatch: () => EvidenceBatch | null;
  receiveBatch: (batch: EvidenceBatch) => void;
  reset: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setIndoorSpatialization: (enabled: boolean) => void;
  setViewportMode: (mode: "indoor" | "geo" | "globe") => void;
  hydrateSnapshot: (snapshot: {
    devices?: Array<Record<string, any>>;
    telemetryEvents?: Array<Record<string, any>>;
    incidents?: Array<Record<string, any>>;
    batches?: Array<Record<string, any>>;
  }) => void;
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

  triggerScenario: (scenario) => {
    let devices = Object.values(get().devices);
    if (!devices.length) {
      get().spawnSimulatedDevices(1, "scenario-demo");
      devices = Object.values(get().devices);
    }
    const target = devices[Math.floor(Math.random() * devices.length)];
    const profile = {
      bump: {
        riskScore: 28,
        flags: 1,
        reason: "Road shock detected. No route deviation, no unauthorized stop, no seal break.",
        verification: "Signed" as const
      },
      mishandling: {
        riskScore: 58,
        flags: 1 | 512,
        reason: "Handling risk detected: repeated shock pattern. Inspect packaging at next checkpoint.",
        verification: "Batched" as const
      },
      theft: {
        riskScore: 94,
        flags: 1 | 2 | 1024 | 2048,
        reason: "Likely theft: shock + route deviation + unauthorized dwell + seal signal.",
        verification: "Batched" as const
      }
    }[scenario];
    const incident: Incident = {
      id: crypto.randomUUID(),
      deviceId: target.id,
      alias: target.alias,
      riskScore: profile.riskScore,
      flags: profile.flags,
      reason: `${profile.reason} Evidence queued for Monad.`,
      payloadHash: target.payloadHash,
      createdAt: Date.now()
    };
    set((state) => ({
      incidents: [incident, ...state.incidents].slice(0, 12),
      devices: {
        ...state.devices,
        [target.id]: {
          ...target,
          riskScore: profile.riskScore,
          riskFlags: profile.flags,
          verification: profile.verification
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

  hydrateSnapshot: (snapshot) =>
    set((state) => {
      const latestByDevice = new Map<string, Record<string, any>>();
      for (const event of snapshot.telemetryEvents ?? []) {
        if (!latestByDevice.has(event.device_id)) latestByDevice.set(event.device_id, event);
      }

      const devices = { ...state.devices };
      for (const [index, row] of (snapshot.devices ?? []).entries()) {
        const existing = devices[row.id];
        const latest = latestByDevice.get(row.id);
        const angle = (index + 1) * 0.72;
        const lat = row.latest_lat_e7 ? Number(row.latest_lat_e7) / 1e7 : existing?.lat ?? WAREHOUSE.lat + Math.sin(angle) * 0.00055;
        const lng = row.latest_lng_e7 ? Number(row.latest_lng_e7) / 1e7 : existing?.lng ?? WAREHOUSE.lng + Math.cos(angle) * 0.00055;
        devices[row.id] = {
          id: row.id,
          alias: row.alias ?? existing?.alias ?? aliasFor(row.id, index),
          deviceClass: row.device_class ?? existing?.deviceClass ?? "unknown",
          lat,
          lng,
          accuracyM: row.latest_accuracy_cm ? Math.round(Number(row.latest_accuracy_cm) / 100) : existing?.accuracyM ?? null,
          batteryPct: existing?.batteryPct ?? null,
          online: Boolean(row.online ?? true),
          lastSeen: row.last_seen_at ? new Date(row.last_seen_at).getTime() : existing?.lastSeen ?? Date.now(),
          joinedAt: row.first_seen_at ? new Date(row.first_seen_at).getTime() : existing?.joinedAt ?? Date.now(),
          seq: latest?.seq ? Number(latest.seq) : existing?.seq ?? 0,
          riskScore: Number(row.latest_risk_score ?? latest?.risk_score ?? existing?.riskScore ?? 0),
          riskFlags: Number(row.latest_risk_flags ?? latest?.risk_flags ?? existing?.riskFlags ?? 0),
          verification: row.latest_batch_sequence || row.latest_tx_hash ? "Verified" : latest ? "Signed" : existing?.verification ?? "Live",
          payloadHash: latest?.payload_hash ?? existing?.payloadHash ?? `0x${"0".repeat(64)}`,
          txHash: row.latest_tx_hash ?? latest?.tx_hash ?? existing?.txHash,
          trail: existing?.trail ?? [{ lat, lng, t: row.last_seen_at ? new Date(row.last_seen_at).getTime() : Date.now() }]
        };
      }

      const batches = (snapshot.batches ?? []).map((row) => ({
        sequence: Number(row.sequence),
        merkleRoot: row.merkle_root,
        sampleCount: Number(row.sample_count ?? 0),
        maxRiskScore: Number(row.max_risk_score ?? 0),
        flags: Number(row.combined_flags ?? 0),
        txHash: row.tx_hash,
        status: row.status === "pending" ? "pending" : "verified",
        createdAt: row.committed_at || row.submitted_at || row.created_at ? new Date(row.committed_at ?? row.submitted_at ?? row.created_at).getTime() : Date.now(),
        simulated: process.env.NEXT_PUBLIC_CHAIN_DISABLED !== "false"
      })) as EvidenceBatch[];

      const incidents = (snapshot.incidents ?? []).map((row) => ({
        id: String(row.id),
        deviceId: row.device_id ?? "unknown",
        alias: devices[row.device_id]?.alias ?? "Mobile Witness",
        riskScore: Number(row.risk_score ?? 0),
        flags: Number(row.risk_flags ?? 0),
        reason: row.agent_summary ?? row.summary ?? row.title ?? "custody incident",
        payloadHash: row.evidence_hash ?? `0x${"0".repeat(64)}`,
        txHash: row.tx_hash ?? undefined,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
      })) as Incident[];

      return {
        devices,
        batches: batches.length ? batches : state.batches,
        latestTx: batches[0]?.txHash ?? state.latestTx,
        incidents: incidents.length ? incidents : state.incidents,
        telemetryEvents: [
          ...state.telemetryEvents,
          ...(snapshot.telemetryEvents ?? []).map((event) => (event.received_at ? new Date(event.received_at).getTime() : Date.now()))
        ].slice(-400),
        swarmOverlay: Object.keys(devices).length >= 30 || state.swarmOverlay
      };
    }),

  reset: () => set({ devices: {}, incidents: [], batches: [], latestTx: undefined, telemetryEvents: [], swarmOverlay: false, viewportMode: "indoor" }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setIndoorSpatialization: (enabled) => set({ indoorSpatialization: enabled }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  hideSwarmOverlay: () => set({ swarmOverlay: false })
}));
