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
- `app/shipment/[shipmentId]`: authorized shipment journey and delivery proof page.
- `app/api/sessions`: create a session.
- `app/api/session/[sessionId]`: safe session lookup and dashboard-token join URL reveal.
- `app/api/telemetry/batch`: ingest signed telemetry.
- `app/api/chain/emergency-commit`: serverless batch commit safety net.
- `app/api/simulate`: demo realtime broadcast helper.
- `app/api/agent/narrate`: deterministic incident narration fallback.

Important libraries:

- `lib/store/sentinelStore.ts`: local dashboard state and simulation.
- `lib/evidence/privateEvidence.ts`: AES-GCM payload envelope, salted commitments, event hash, and private leaf generation.
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
- private event commitments
- encrypted evidence envelope types
- Merkle roots and proofs
- deterministic risk scoring and custody classification
- motion, stop/dwell, distance, and cold-chain exposure helpers
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

`migrations/002_private_evidence.sql` adds:

- shipment and policy commitments
- server-side join token storage for tokenized QR generation
- encrypted evidence columns
- custody_events
- shipments
- route_policies
- evidence_receipts

## Verification Commands

```bash
pnpm build
pnpm test
pnpm sentinel:verify
pnpm contracts:test
```

`pnpm contracts:test` requires Foundry.
