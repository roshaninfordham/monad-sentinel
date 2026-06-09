# Demo and Deployment Runbook

## Local Demo

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Recommended demo path:

1. Click **Start Live Custody Swarm**.
2. Confirm dashboard shows a QR and session status.
3. Click **Enable Sound**.
4. Click **Spawn 50**.
5. Click **Trigger theft**.
6. Click **Commit batch**.
7. Open the latest receipt from the evidence rail.

## Real Phone Testing

Use the network URL printed by Next.js, for example:

```txt
http://10.x.x.x:3000
```

For production phone testing, deploy to Vercel and set:

```txt
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.app
```

Browser GPS and motion require HTTPS in most real deployments.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_init.sql`.
3. Enable Realtime for tables/channels as needed.
4. Set env vars:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

The browser uses the publishable key. API routes and the Chain Agent use the secret key.

## Monad Setup

1. Install Foundry.
2. Fund the gateway wallet on Monad Testnet.
3. Deploy the contract:

```bash
MONAD_RPC_URL=... GATEWAY_PRIVATE_KEY=... pnpm contracts:deploy
```

4. Set:

```txt
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_MONAD_EXPLORER_URL=
MONAD_RPC_URL=
GATEWAY_PRIVATE_KEY=
CHAIN_DISABLED=false
```

## Chain Agent

Run locally during the hackathon:

```bash
pnpm agent:dev
```

The worker:

- polls unbatched telemetry
- builds Merkle roots and proofs
- inserts pending batches
- commits `commitBatch` when `CHAIN_DISABLED=false`
- updates tx hashes and broadcasts chain events

If env vars are missing, it waits rather than crashing.

## Demo Script

```txt
0:00  Open landing: "Stop trusting GPS. Prove custody."
0:15  Start session and show QR.
0:35  Audience scans; devices pop onto the command center.
1:05  Spawn 50 if the room is slow.
1:20  Ask someone to shake their phone or trigger theft.
1:25  Red ripple and incident card appear.
1:45  Commit batch; evidence rail updates.
2:05  Open receipt and explain hash -> proof -> Monad root.
```

## Troubleshooting

### QR points to localhost

Set `NEXT_PUBLIC_APP_URL` to the public deployment URL and rebuild/redeploy.

### Phone cannot get GPS or motion

Use HTTPS and grant permissions. If unavailable, the mobile UI uses indoor spatialization and manual tamper.

### Dashboard does not receive realtime events

Check Supabase env vars and Realtime channel configuration. Local simulation works without Supabase.

### Chain batches stay simulated

Set `CHAIN_DISABLED=false` and provide `MONAD_RPC_URL`, `GATEWAY_PRIVATE_KEY`, and `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### Foundry commands fail

Install Foundry. This repo includes Foundry config and tests, but `forge` must be present locally.
