# Agent Guide

This repo is a hackathon demo, but the code should be treated as a real product prototype.

## Product Positioning

Monad Sentinel is not "GPS on blockchain." It is a live proof-of-custody swarm:

- phones become signed custody witnesses
- risk agents detect suspicious motion/custody events
- Chain Agent commits evidence batches to Monad
- dashboard verifies the live event against a tamper-evident batch

## Development Priorities

1. Keep the demo path working without credentials.
2. Keep real Supabase/Monad paths clearly separated from simulated mode.
3. Never put raw GPS coordinates on-chain.
4. Never expose secret keys to browser code.
5. Prefer deterministic fallbacks over fragile LLM-only flows.

## Commands

```bash
pnpm build
pnpm test
pnpm dev
pnpm agent:dev
```

Contract commands require Foundry:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:deploy
```

## Architecture Rules

- Supabase is the app database and realtime layer.
- Monad is the immutable evidence commitment layer.
- Phones sign telemetry with ephemeral EIP-712 keys.
- Chain Agent batches leaf hashes into Merkle roots.
- Receipt verification must prove payload hash, signature, Merkle inclusion, and contract root.

## UI Rules

- Dashboard must stay projector-ready.
- QR must use `NEXT_PUBLIC_APP_URL` in production.
- Simulated chain state must be labeled simulated.
- Sound is opt-in only.
- GPS/motion/battery failures should degrade gracefully.
