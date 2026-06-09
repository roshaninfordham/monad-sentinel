# Shared Protocol Package

`@monad-sentinel/shared` contains protocol code used by the web app and Chain Agent.

## Includes

- Zod schemas for telemetry.
- Canonical JSON serialization.
- Payload hashing with `keccak256`.
- EIP-712 typed data generation and signer recovery.
- Leaf hashing for Merkle batches.
- Merkle root, proof generation, and proof verification.
- Deterministic risk scoring.
- Realtime event view types.

## Protocol Sketch

```mermaid
flowchart LR
  Payload[TelemetryPayload] --> Canonical[canonicalJson]
  Canonical --> PayloadHash[payloadHash]
  PayloadHash --> Signature[EIP-712 signature]
  PayloadHash --> Leaf[leafHash]
  Leaf --> Root[Merkle root]
  Root --> Monad[SentinelEvidenceLedger]
```

## Test

```bash
pnpm --filter @monad-sentinel/shared test
```
