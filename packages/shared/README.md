# Shared Protocol Package

`@monad-sentinel/shared` contains protocol code used by the web app and Chain Agent.

## Includes

- Zod schemas for telemetry.
- Canonical JSON serialization.
- Payload hashing with `keccak256`.
- EIP-712 typed data generation and signer recovery.
- Private evidence commitments and leaf hashing for Merkle batches.
- Merkle root, proof generation, and proof verification.
- Deterministic risk scoring and custody event classification.
- Motion, stop/dwell, distance, and cold-chain exposure helpers.
- Realtime event view types.

## Protocol Sketch

```mermaid
flowchart LR
  Payload[TelemetryPayload] --> Canonical[canonicalJson]
  Canonical --> PayloadHash[payloadHash]
  PayloadHash --> Signature[EIP-712 signature]
  Payload --> Commitment[Salted payload commitment]
  Payload --> Cipher[Encrypted payload hash]
  Commitment --> EventHash[eventHash]
  Cipher --> EventHash
  Signature --> Leaf[private evidence leafHash]
  EventHash --> Leaf
  Leaf --> Root[Merkle root]
  Root --> Monad[SentinelEvidenceLedger]
```

## Test

```bash
pnpm --filter @monad-sentinel/shared test
```
