import { encodePacked, getAddress, keccak256, recoverTypedDataAddress, stringToHex } from "viem";
import { z } from "zod";

export const RISK_FLAGS = {
  SHAKE_TAMPER: 1,
  GEOFENCE_EXIT: 2,
  GPS_JUMP: 4,
  SENSOR_SILENCE: 8,
  BATTERY_CRITICAL: 16,
  CHAIN_LAG: 32,
  HIGH_ACCURACY_LOSS: 64,
  MANUAL_DEMO_ALERT: 128
} as const;

export type DeviceClass = "mobile" | "tablet" | "desktop" | "unknown";
export type VerificationState = "Live" | "Signed" | "Batched" | "Committed" | "Verified";
export type RiskState = "normal" | "suspicious" | "tamper" | "offline";
export type RiskSeverity = "normal" | "watch" | "suspicious" | "tamper" | "critical";
export type Hex = `0x${string}`;

export const telemetryPayloadSchema = z.object({
  version: z.literal(1),
  sessionId: z.string().min(1),
  deviceId: z.string().min(1),
  deviceAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  seq: z.number().int().nonnegative(),
  capturedAt: z.number().int(),
  latE7: z.number().int().nullable(),
  lngE7: z.number().int().nullable(),
  accuracyCm: z.number().int().nullable(),
  altitudeCm: z.number().int().nullable().optional(),
  speedCmS: z.number().int().nullable().optional(),
  headingDeg: z.number().nullable().optional(),
  accelX: z.number().nullable().optional(),
  accelY: z.number().nullable().optional(),
  accelZ: z.number().nullable().optional(),
  rotationAlpha: z.number().nullable().optional(),
  rotationBeta: z.number().nullable().optional(),
  rotationGamma: z.number().nullable().optional(),
  batteryPct: z.number().nullable().optional(),
  charging: z.boolean().nullable().optional(),
  deviceClass: z.enum(["mobile", "tablet", "desktop", "unknown"]),
  browserHints: z.object({
    platform: z.string().optional(),
    touch: z.boolean(),
    screenW: z.number().int(),
    screenH: z.number().int()
  }),
  riskFlags: z.number().int().nonnegative(),
  previousPayloadHash: z.string().optional()
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export const signedTelemetrySchema = z.object({
  payload: telemetryPayloadSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  payloadHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  joinToken: z.string().optional(),
  manualAlert: z.boolean().optional()
});

export type SignedTelemetry = z.infer<typeof signedTelemetrySchema>;

export const telemetryBatchRequestSchema = z.object({
  sessionId: z.string().min(1),
  deviceAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  events: z.array(signedTelemetrySchema).min(1).max(25),
  joinToken: z.string().optional()
});

export type TelemetryBatchRequest = z.infer<typeof telemetryBatchRequestSchema>;

export type LiveDevice = {
  id: string;
  alias: string;
  deviceClass: DeviceClass;
  lat: number;
  lng: number;
  accuracyM: number | null;
  batteryPct: number | null;
  online: boolean;
  lastSeen: number;
  joinedAt: number;
  seq: number;
  riskScore: number;
  riskFlags: number;
  verification: VerificationState;
  payloadHash: string;
  txHash?: string;
  trail: Array<{ lat: number; lng: number; t: number }>;
};

export type Incident = {
  id: string;
  deviceId: string;
  alias: string;
  riskScore: number;
  flags: number;
  reason: string;
  payloadHash: string;
  txHash?: string;
  batchSequence?: number;
  createdAt: number;
};

export type EvidenceBatch = {
  sequence: number;
  merkleRoot: string;
  sampleCount: number;
  maxRiskScore: number;
  flags: number;
  txHash: string;
  status: "pending" | "committed" | "verified";
  createdAt: number;
  simulated: boolean;
};

export type DeviceView = {
  id: string;
  sessionId: string;
  alias: string;
  deviceAddress: Hex;
  deviceClass: DeviceClass;
  status: "joining" | "live" | "signed" | "verified" | "quarantined" | "offline";
  latestRiskScore: number;
  latestRiskFlags: number;
  lastSeenAt: string;
};

export type TelemetryView = {
  id?: number;
  sessionId: string;
  deviceId: string;
  seq: number;
  payloadHash: Hex;
  leafHash: Hex;
  riskScore: number;
  riskFlags: number;
  riskReason: string;
  receivedAt: string;
};

export type BatchView = {
  sessionId: string;
  sequence: number;
  merkleRoot: Hex;
  sampleCount: number;
  maxRiskScore: number;
  combinedFlags: number;
  txHash?: Hex;
  status: "pending" | "submitted" | "committed" | "verified" | "failed";
  simulated: boolean;
};

export type RealtimeEvent =
  | { type: "device.joined"; device: DeviceView }
  | { type: "device.updated"; device: Partial<DeviceView> & { id: string } }
  | { type: "device.offline"; deviceId: string }
  | { type: "telemetry.accepted"; event: TelemetryView }
  | { type: "risk.alert"; incident: Incident }
  | { type: "chain.batch.pending"; batch: BatchView }
  | { type: "chain.batch.committed"; batch: BatchView }
  | { type: "agent.action"; action: Record<string, unknown> };

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

export function hashPayload(payload: TelemetryPayload): `0x${string}` {
  return keccak256(stringToHex(canonicalJson(payload)));
}

export const telemetryTypedDataTypes = {
  Telemetry: [
    { name: "sessionId", type: "bytes32" },
    { name: "deviceId", type: "bytes32" },
    { name: "seq", type: "uint64" },
    { name: "payloadHash", type: "bytes32" },
    { name: "clientTimestampMs", type: "uint256" }
  ]
} as const;

export function bytes32FromText(value: string): Hex {
  return keccak256(stringToHex(value));
}

export function telemetryTypedData(input: {
  chainId: number;
  verifyingContract?: Hex;
  payload: TelemetryPayload;
  payloadHash?: Hex;
}) {
  return {
    domain: {
      name: "MonadSentinel",
      version: "1",
      chainId: input.chainId,
      verifyingContract: input.verifyingContract ?? "0x0000000000000000000000000000000000000000"
    },
    types: telemetryTypedDataTypes,
    primaryType: "Telemetry" as const,
    message: {
      sessionId: bytes32FromText(input.payload.sessionId),
      deviceId: bytes32FromText(input.payload.deviceId),
      seq: BigInt(input.payload.seq),
      payloadHash: input.payloadHash ?? hashPayload(input.payload),
      clientTimestampMs: BigInt(input.payload.capturedAt)
    }
  };
}

export async function recoverTelemetrySigner(input: {
  chainId: number;
  verifyingContract?: Hex;
  payload: TelemetryPayload;
  signature: Hex;
  payloadHash?: Hex;
}): Promise<Hex> {
  const typed = telemetryTypedData(input);
  return getAddress(
    await recoverTypedDataAddress({
      domain: typed.domain,
      types: typed.types,
      primaryType: typed.primaryType,
      message: typed.message,
      signature: input.signature
    })
  ) as Hex;
}

export function buildLeafHash(input: {
  sessionContractId: Hex;
  deviceId: string;
  seq: number;
  payloadHash: Hex;
  riskScore: number;
  riskFlags: number;
  clientTimestampMs: number;
}): Hex {
  return keccak256(
    encodePacked(
      ["bytes32", "bytes32", "uint64", "bytes32", "uint16", "uint16", "uint256"],
      [
        input.sessionContractId,
        bytes32FromText(input.deviceId),
        BigInt(input.seq),
        input.payloadHash,
        input.riskScore,
        input.riskFlags,
        BigInt(input.clientTimestampMs)
      ]
    )
  );
}

export function shortHash(hash?: string, chars = 6): string {
  if (!hash) return "pending";
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

export function buildMerkleRoot(leaves: string[]): `0x${string}` {
  if (leaves.length === 0) return `0x${"0".repeat(64)}`;
  let level = leaves.map((leaf) => leaf as `0x${string}`);
  while (level.length > 1) {
    const next: `0x${string}`[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(keccak256(`${left}${right.slice(2)}` as `0x${string}`));
    }
    level = next;
  }
  return level[0];
}

export type MerkleProofStep = {
  position: "left" | "right";
  hash: Hex;
};

export function buildMerkleProof(leaves: Hex[], leafIndex: number): MerkleProofStep[] {
  if (leafIndex < 0 || leafIndex >= leaves.length) return [];
  let index = leafIndex;
  let level = [...leaves];
  const proof: MerkleProofStep[] = [];
  while (level.length > 1) {
    const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
    const sibling = level[siblingIndex] ?? level[index];
    proof.push({ position: index % 2 === 0 ? "right" : "left", hash: sibling });
    const next: Hex[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(keccak256(`${left}${right.slice(2)}` as Hex));
    }
    index = Math.floor(index / 2);
    level = next;
  }
  return proof;
}

export function verifyMerkleProof(leaf: Hex, proof: MerkleProofStep[], root: Hex): boolean {
  const computed = proof.reduce((acc, step) => {
    return step.position === "left"
      ? keccak256(`${step.hash}${acc.slice(2)}` as Hex)
      : keccak256(`${acc}${step.hash.slice(2)}` as Hex);
  }, leaf);
  return computed.toLowerCase() === root.toLowerCase();
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earth = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

export function scoreRisk(input: {
  payload: Partial<TelemetryPayload>;
  previous?: LiveDevice;
  origin?: { lat: number; lng: number };
  manualAlert?: boolean;
}): { riskScore: number; riskFlags: number; reason: string; severity: RiskSeverity } {
  let flags = input.payload.riskFlags ?? 0;
  let score = 0;
  const reasons: string[] = [];
  const ax = input.payload.accelX ?? 0;
  const ay = input.payload.accelY ?? 0;
  const az = input.payload.accelZ ?? 0;
  const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);

  if (magnitude > 22) {
    flags |= RISK_FLAGS.SHAKE_TAMPER;
    score += 55;
    reasons.push(`acceleration spike ${magnitude.toFixed(1)} m/s²`);
  }
  if (input.manualAlert) {
    flags |= RISK_FLAGS.MANUAL_DEMO_ALERT;
    score += 80;
    reasons.push("manual cargo tamper simulation");
  }
  if (input.payload.batteryPct !== null && input.payload.batteryPct !== undefined && input.payload.batteryPct < 15) {
    flags |= RISK_FLAGS.BATTERY_CRITICAL;
    score += 16;
    reasons.push("battery below 15%");
  }
  if ((input.payload.accuracyCm ?? 0) > 5000) {
    flags |= RISK_FLAGS.HIGH_ACCURACY_LOSS;
    score += 18;
    reasons.push("GPS accuracy degraded");
  }

  if (input.payload.latE7 !== null && input.payload.lngE7 !== null && input.payload.latE7 && input.payload.lngE7) {
    const current = { lat: input.payload.latE7 / 1e7, lng: input.payload.lngE7 / 1e7 };
    if (input.origin && distanceMeters(input.origin, current) > 25) {
      flags |= RISK_FLAGS.GEOFENCE_EXIT;
      score += 35;
      reasons.push("device left custody geofence");
    }
    if (input.previous && input.previous.trail.length > 0) {
      const last = input.previous.trail[input.previous.trail.length - 1];
      const seconds = Math.max(1, ((input.payload.capturedAt ?? Date.now()) - last.t) / 1000);
      if (distanceMeters(last, current) / seconds > 35) {
        flags |= RISK_FLAGS.GPS_JUMP;
        score += 40;
        reasons.push("physically implausible GPS jump");
      }
    }
  }

  const riskScore = Math.min(100, score);
  const severity: RiskSeverity =
    riskScore >= 90 ? "critical" : riskScore >= 80 ? "tamper" : riskScore >= 60 ? "suspicious" : riskScore >= 30 ? "watch" : "normal";
  return {
    riskScore,
    riskFlags: flags,
    reason: reasons.length ? reasons.join(" + ") : "custody telemetry normal",
    severity
  };
}
