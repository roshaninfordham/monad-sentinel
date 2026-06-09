# Codebase Map

## Root

- `package.json`: workspace scripts.
- `.env.example`: all expected configuration values.
- `pnpm-workspace.yaml`: monorepo package layout.
- `README.md`: product overview and quick start.
- `scripts/sentinel.ts`: one-command demo launch and verification helper.

## `apps/web`

Next.js App Router frontend and API.

Important routes:

- `app/page.tsx`: landing page and session start CTA.
- `app/dashboard/[sessionId]`: command center dashboard.
- `app/s/[sessionId]`: mobile sensor witness page.
- `app/receipt/[sessionId]/[batchId]`: evidence receipt page.
- `app/api/sessions`: create a session.
- `app/api/telemetry/batch`: ingest signed telemetry.
- `app/api/simulate`: demo realtime broadcast helper.
- `app/api/agent/narrate`: deterministic incident narration fallback.

Important libraries:

- `lib/store/sentinelStore.ts`: local dashboard state and simulation.
- `lib/sound/SoundEngine.ts`: generated Web Audio effects.
- `lib/supabase`: browser/server Supabase clients.
- `src/generated/contract.ts`: frontend ABI/address hook.

## `packages/shared`

Shared protocol code:

- telemetry schema
- canonical JSON hashing
- EIP-712 typed data helpers
- signer recovery
- leaf hashing
- Merkle roots and proofs
- deterministic risk scoring
- realtime view types

This package is imported by the web app and chain agent.

## `packages/contracts`

Foundry Solidity project:

- `src/SentinelEvidenceLedger.sol`: evidence ledger contract.
- `script/Deploy.s.sol`: deploy script.
- `test/SentinelEvidenceLedger.t.sol`: contract behavior tests.

The contract stores compact commitments only. It does not store raw GPS arrays.

## `packages/chain-agent`

Long-running worker:

- polls Supabase for unbatched telemetry
- builds Merkle proofs
- inserts telemetry batch rows
- commits to Monad or simulates clearly
- broadcasts `chain.batch.committed`

## `supabase`

`migrations/001_init.sql` defines:

- sessions
- devices
- telemetry_events
- telemetry_batches
- merkle_proofs
- incidents
- agent_actions
- chain_outbox

## Verification Commands

```bash
pnpm build
pnpm test
pnpm sentinel:verify
pnpm contracts:test
```

`pnpm contracts:test` requires Foundry.
