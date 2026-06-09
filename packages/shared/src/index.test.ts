import { describe, expect, it } from "vitest";
import {
  buildEventHash,
  buildMerkleProof,
  buildMerkleRoot,
  bytes32FromText,
  classifyCustodyRisk,
  detectStopSegment,
  RISK_FLAGS,
  temperatureExposureDegreeMinutes,
  verifyMerkleProof
} from "./index";

describe("Merkle evidence", () => {
  it("verifies every generated proof against the root", () => {
    const leaves = ["a", "b", "c", "d"].map(bytes32FromText);
    const root = buildMerkleRoot(leaves);

    leaves.forEach((leaf, index) => {
      expect(verifyMerkleProof(leaf, buildMerkleProof(leaves, index), root)).toBe(true);
    });
  });
});

describe("Private event hash", () => {
  it("changes when the previous event hash changes", () => {
    const base = {
      shipmentCommitment: bytes32FromText("shipment"),
      devicePseudonym: bytes32FromText("device"),
      seq: 7,
      timestamp: 1710000000000,
      payloadCommitment: bytes32FromText("payload"),
      ciphertextHash: bytes32FromText("ciphertext")
    };

    expect(
      buildEventHash({
        ...base,
        previousEventHash: bytes32FromText("previous-a")
      })
    ).not.toEqual(
      buildEventHash({
        ...base,
        previousEventHash: bytes32FromText("previous-b")
      })
    );
  });
});

describe("Custody risk classification", () => {
  it("classifies shock-only events as bumps", () => {
    const result = classifyCustodyRisk({ shockEnergy: 150, jerkPeak: 4 });
    expect(result.eventClass).toBe("bump");
    expect(result.riskFlags & RISK_FLAGS.SHAKE_TAMPER).toBeTruthy();
    expect(result.riskScore).toBeLessThan(45);
  });

  it("classifies route deviation plus demo theft as likely theft", () => {
    const result = classifyCustodyRisk({
      shockEnergy: 500,
      routeDeviationM: 80,
      unauthorizedStopSeconds: 420,
      sealBroken: true,
      manualTheft: true
    });
    expect(result.eventClass).toBe("likely_theft");
    expect(result.riskScore).toBe(100);
    expect(result.riskFlags & RISK_FLAGS.SEAL_BROKEN).toBeTruthy();
  });

  it("classifies sustained temperature exposure as cold-chain risk", () => {
    const result = classifyCustodyRisk({ temperatureCx10: 116, exposureDegreeMinutes: 18 });
    expect(result.eventClass).toBe("cold_chain");
    expect(result.riskFlags & RISK_FLAGS.COLD_CHAIN_EXCURSION).toBeTruthy();
  });
});

describe("Journey helpers", () => {
  it("computes cold-chain degree-minutes", () => {
    expect(
      temperatureExposureDegreeMinutes(
        [
          { temperatureCx10: 90, timestampMs: 0 },
          { temperatureCx10: 100, timestampMs: 60000 }
        ],
        80
      )
    ).toBeCloseTo(1.5);
  });

  it("detects a dwell stop when points remain in a small radius", () => {
    const stop = detectStopSegment(
      [
        { lat: 40.7, lng: -73.9, timestampMs: 0 },
        { lat: 40.70001, lng: -73.90001, timestampMs: 120000 },
        { lat: 40.70002, lng: -73.90002, timestampMs: 240000 }
      ],
      30,
      180
    );
    expect(stop?.durationSeconds).toBe(240);
  });
});
