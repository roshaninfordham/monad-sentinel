# Supabase

Supabase is the application database, realtime relay, and encrypted data availability layer. Monad is the public evidence anchor.

## Migration

Run:

```bash
npx supabase db push
```

This applies `001_init.sql` and `002_private_evidence.sql`.

## Tables

- `sessions`: live demo sessions and public/private tokens.
- `devices`: joined witnesses and latest state.
- `telemetry_events`: signed telemetry rows, encrypted payload envelopes, commitments, and risk outputs.
- `telemetry_batches`: Merkle batch state and chain receipt metadata.
- `merkle_proofs`: inclusion proof per telemetry event.
- `incidents`: risk alerts and agent summaries.
- `agent_actions`: audit log for proposed/executed agent actions.
- `chain_outbox`: future queue for robust chain retries.
- `shipments`: authorized journey records and delivery state.
- `custody_events`: pickup/telemetry/shock/route/cold-chain/delivery timeline.
- `route_policies`: encrypted/committed route policy metadata.
- `evidence_receipts`: receipt records per committed batch.

The schema includes `use_case`, `viewport_mode`, `simulated_temperature_c_x10`, and `product_type` so the demo can speak to pharma, food, medical, and high-value freight without changing the protocol.

## Security Model

- Browser clients do not write durable telemetry directly.
- Phones POST signed telemetry to `/api/telemetry/batch`.
- Telemetry must include the join token from the QR URL.
- Server routes use a secret key to write rows.
- Raw payload details are encrypted and stored in `encrypted_payload`; the public chain receives only commitments.
- Dashboard subscribes to session channels for live demo state.
- Never expose service-role or secret keys to browser code.

## Trust Model

Supabase can make data available and queryable, but it is not the integrity root. Integrity comes from:

```txt
device signatures
payload commitments
ciphertext hashes
previousEventHash links
Merkle proofs
Monad batch roots
```
