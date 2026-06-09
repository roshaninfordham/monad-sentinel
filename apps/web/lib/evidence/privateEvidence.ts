import { bytesToHex, hexToBytes, stringToHex } from "viem";
import {
  buildEventHash,
  buildPrivateEvidenceLeafHash,
  buildRiskCommitment,
  deriveDevicePseudonym,
  deriveShipmentCommitment,
  hashCiphertext,
  hashPayload,
  Hex,
  PrivateEvidenceEnvelope,
  saltedCommitment,
  TelemetryPayload
} from "@monad-sentinel/shared";

type EvidenceInput = {
  payload: TelemetryPayload;
  signature: Hex;
  risk: {
    riskScore: number;
    riskFlags: number;
    eventClass: "normal" | "bump" | "mishandling" | "likely_theft" | "cold_chain" | "delivery";
    reason: string;
  };
};

function randomHex(bytes: number): Hex {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return bytesToHex(array);
}

function evidenceSecret() {
  return (
    process.env.EVIDENCE_SHIPMENT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "monad-sentinel-demo-secret"
  );
}

function evidenceKeyMaterial(): Hex {
  const configured = process.env.EVIDENCE_ENCRYPTION_KEY;
  if (configured && /^0x[a-fA-F0-9]{64}$/.test(configured)) return configured as Hex;
  return hashPayload({
    version: 1,
    sessionId: "key-derivation",
    deviceId: "server",
    deviceAddress: "0x0000000000000000000000000000000000000000",
    seq: 0,
    capturedAt: 0,
    latE7: null,
    lngE7: null,
    accuracyCm: null,
    deviceClass: "unknown",
    browserHints: { touch: false, screenW: 0, screenH: 0 },
    riskFlags: 0,
    previousEventHash: stringToHex(evidenceSecret()).padEnd(66, "0").slice(0, 66) as Hex
  });
}

function bytesBuffer(hex: Hex): ArrayBuffer {
  const bytes = new Uint8Array(hexToBytes(hex));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function importAesKey() {
  return crypto.subtle.importKey("raw", bytesBuffer(evidenceKeyMaterial()), "AES-GCM", false, ["encrypt", "decrypt"]);
}

function associatedData(input: { shipmentCommitment: Hex; devicePseudonym: Hex; seq: number }) {
  return `${input.shipmentCommitment}:${input.devicePseudonym}:${input.seq}`;
}

export async function encryptPrivateEvidence(input: EvidenceInput): Promise<{
  shipmentCommitment: Hex;
  devicePseudonym: Hex;
  payloadSalt: Hex;
  payloadCommitment: Hex;
  envelope: PrivateEvidenceEnvelope;
  previousEventHash: Hex;
  eventHash: Hex;
  riskCommitment: Hex;
  leafHash: Hex;
}> {
  const shipmentCommitment =
    (input.payload.shipmentCommitment as Hex | undefined) ?? deriveShipmentCommitment(evidenceSecret(), input.payload.sessionId);
  const devicePseudonym =
    (input.payload.devicePseudonym as Hex | undefined) ?? deriveDevicePseudonym(evidenceSecret(), input.payload.deviceAddress);
  const payloadSalt = (input.payload.payloadSalt as Hex | undefined) ?? randomHex(32);
  const payloadCommitment = (input.payload.payloadCommitment as Hex | undefined) ?? saltedCommitment(payloadSalt, input.payload);
  const aad = associatedData({ shipmentCommitment, devicePseudonym, seq: input.payload.seq });
  const iv = randomHex(12);
  const key = await importAesKey();
  const encodedPayload = new TextEncoder().encode(JSON.stringify(input.payload));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: bytesBuffer(iv), additionalData: new TextEncoder().encode(aad) },
    key,
    encodedPayload
  );
  const ciphertext = bytesToHex(new Uint8Array(ciphertextBuffer));
  const ciphertextHash = hashCiphertext(ciphertext);
  const previousEventHash =
    (input.payload.previousEventHash as Hex | undefined) ??
    (input.payload.previousPayloadHash && /^0x[a-fA-F0-9]{64}$/.test(input.payload.previousPayloadHash)
      ? (input.payload.previousPayloadHash as Hex)
      : (`0x${"0".repeat(64)}` as Hex));
  const eventHash = buildEventHash({
    shipmentCommitment,
    devicePseudonym,
    seq: input.payload.seq,
    timestamp: input.payload.capturedAt,
    payloadCommitment,
    ciphertextHash,
    previousEventHash
  });
  const riskCommitment = buildRiskCommitment({
    salt: payloadSalt,
    riskScore: input.risk.riskScore,
    riskFlags: input.risk.riskFlags,
    eventClass: input.risk.eventClass,
    reason: input.risk.reason
  });
  const leafHash = buildPrivateEvidenceLeafHash({ eventHash, signature: input.signature, riskCommitment });

  return {
    shipmentCommitment,
    devicePseudonym,
    payloadSalt,
    payloadCommitment,
    envelope: {
      version: 1,
      algorithm: "AES-256-GCM",
      iv,
      ciphertext,
      ciphertextHash,
      associatedData: aad
    },
    previousEventHash,
    eventHash,
    riskCommitment,
    leafHash
  };
}
