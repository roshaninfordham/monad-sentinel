# Supabase

Supabase is the application database and realtime relay. Monad is the evidence layer.

## Migration

Run:

```sql
supabase/migrations/001_init.sql
```

## Tables

- `sessions`: live demo sessions and public/private tokens.
- `devices`: joined witnesses and latest state.
- `telemetry_events`: signed telemetry rows and risk outputs.
- `telemetry_batches`: Merkle batch state and chain receipt metadata.
- `merkle_proofs`: inclusion proof per telemetry event.
- `incidents`: risk alerts and agent summaries.
- `agent_actions`: audit log for proposed/executed agent actions.
- `chain_outbox`: future queue for robust chain retries.

The schema includes `use_case`, `viewport_mode`, `simulated_temperature_c_x10`, and `product_type` so the demo can speak to pharma, food, medical, and high-value freight without changing the protocol.

## Security Model

- Browser clients do not write durable telemetry directly.
- Phones POST signed telemetry to `/api/telemetry/batch`.
- Server routes use a secret key to write rows.
- Dashboard subscribes to session channels for live demo state.
- Never expose service-role or secret keys to browser code.
