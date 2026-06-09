# Contracts

Foundry project for Monad Sentinel evidence commitments.

## Contract

`SentinelEvidenceLedger` stores compact proof-of-custody commitments:

- sessions
- registered device events
- batch Merkle roots
- incident evidence events
- `batchRoot(sessionId, sequence)` for receipt verification

It intentionally does not store raw GPS, motion packets, or arrays of telemetry.

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
