# Contracts

Foundry project for Monad Sentinel evidence commitments.

## Contract

`SentinelEvidenceLedger` stores compact proof-of-custody commitments:

- shipment commitments
- route and destination policy commitments
- registered device events
- batch Merkle roots
- incident evidence events
- delivery confirmation events
- `batchRoot(shipmentCommitment, sequence)` for receipt verification

It intentionally does not store raw GPS, motion packets, or arrays of telemetry.

## Current Public API

```solidity
createShipment(bytes32 shipmentCommitment, bytes32 routePolicyCommitment, bytes32 destinationCommitment)
commitBatch(bytes32 shipmentCommitment, uint64 sequence, bytes32 merkleRoot, uint32 sampleCount, uint16 maxRiskScore, uint16 combinedFlags, bytes32 dataAvailabilityHash, uint256 timeBucket)
commitIncident(bytes32 shipmentCommitment, bytes32 evidenceHash, uint16 riskScore, uint16 flags, uint64 batchSequence)
confirmDelivery(bytes32 shipmentCommitment, bytes32 deliveryEvidenceHash, bytes32 receiverCommitment, uint64 batchSequence)
batchRoot(bytes32 shipmentCommitment, uint64 sequence)
```

Compatibility wrappers for older session-oriented tests are still present, but new app code should use shipment commitments.

## Commands

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:deploy
```

These require Foundry and `forge`.

## Deploy Inputs

```txt
MONAD_RPC_URL=
GATEWAY_PRIVATE_KEY=
```

After deployment, set `NEXT_PUBLIC_CONTRACT_ADDRESS` for the web app and Chain Agent.
