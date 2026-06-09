# Architecture

Monad Sentinel is built as four synchronized systems:

1. Human-facing demo system: QR, phone join, dashboard animation, sound, and simulation controls.
2. Realtime telemetry system: signed browser telemetry through Next.js API and Supabase Realtime.
3. Private evidence system: encrypted payload envelopes, hash-linked events, and selective reveal receipts.
4. Monad evidence system: Merkle batch roots committed by a gateway wallet to a Solidity ledger.

## System Context

```mermaid
flowchart LR
  judge[Judge / audience member<br/>Scans QR and becomes a witness]
  presenter[Presenter<br/>Runs dashboard and demo controls]
  app[Monad Sentinel<br/>Live proof-of-custody swarm]
  supabase[Supabase<br/>encrypted evidence store + realtime]
  monad[Monad Testnet<br/>root commitments]
  vercel[Vercel<br/>Next.js hosting]

  judge -->|mobile browser| app
  presenter -->|starts session| app
  vercel -->|hosts| app
  app -->|app state + encrypted evidence + realtime| supabase
  app -->|Merkle roots + compact metadata| monad
```

## Runtime Components

```mermaid
flowchart TB
  subgraph Browser Clients
    Landing[Landing Page]
    Mobile[Mobile Sensor Page]
    Dashboard[Command Center Dashboard]
    Receipt[Evidence Receipt]
    Journey[Shipment Journey]
  end

  subgraph Next App
    SessionsAPI[/api/sessions/]
    TelemetryAPI[/api/telemetry/batch/]
    ChainAPI[/api/chain/emergency-commit/]
    SimAPI[/api/simulate/]
    NarrateAPI[/api/agent/narrate/]
  end

  subgraph Supabase
    DB[(Postgres)]
    Broadcast[Realtime Broadcast]
    Presence[Presence]
  end

  subgraph Worker
    ChainAgent[Chain Agent]
  end

  subgraph Monad
    Ledger[SentinelEvidenceLedger]
  end

  Landing --> SessionsAPI
  Mobile --> TelemetryAPI
  TelemetryAPI --> Broadcast
  TelemetryAPI -->|encrypt + hash-chain| DB
  Dashboard --> Broadcast
  Dashboard --> SimAPI
  Dashboard --> ChainAPI
  ChainAgent --> DB
  ChainAgent --> Ledger
  ChainAgent --> Broadcast
  Receipt --> DB
  Receipt --> Ledger
  Journey --> DB
  NarrateAPI --> Dashboard
```

## Data Flow

1. Presenter creates a session.
2. Dashboard validates its dashboard token and renders a QR to `/s/[sessionId]?t=[joinToken]`, using the public deployment origin in production.
3. Phone creates an ephemeral EVM key and derives a device ID.
4. Phone builds a telemetry payload, canonicalizes it, hashes it, signs EIP-712 typed data, and posts it to `/api/telemetry/batch`.
5. API validates the join token, recomputes the hash, recovers the signer, computes risk, encrypts the payload, creates a salted commitment, builds an event hash, and writes the row.
6. API broadcasts accepted telemetry and risk incidents to the dashboard.
7. Chain Agent or emergency-commit API polls unbatched rows, builds a Merkle tree, stores proofs, inserts a pending batch, then commits `commitBatch` to Monad when enabled.
8. Dashboard receives `chain.batch.committed` and updates the evidence rail.
9. Receipt page verifies encrypted evidence metadata, Merkle proof, and contract `batchRoot`.

## Why Supabase and Monad Both Exist

Supabase handles mutable, high-frequency, user-facing state:

- sessions
- devices
- encrypted telemetry rows
- online state
- incident rows
- Merkle proofs
- custody events and journey views
- chain outbox

Monad handles immutable evidence commitments:

- shipment commitments
- batch roots
- incident/delivery evidence events
- audit-friendly transaction hashes

The split keeps the demo responsive and avoids putting raw GPS, temperature, product, or customer identity on-chain.

## Private Evidence Flow

```mermaid
flowchart LR
  Phone[Phone payload + signature] --> Ingest[Telemetry API]
  Ingest --> Validate[Hash and signature validation]
  Validate --> Encrypt[AES-GCM encrypted payload]
  Validate --> Risk[Risk classifier]
  Encrypt --> EventHash[Event hash + previousEventHash]
  Risk --> RiskCommit[Risk commitment]
  EventHash --> Leaf[Private evidence leaf]
  RiskCommit --> Leaf
  Leaf --> Batch[Merkle batch]
  Batch --> Monad[Monad commitBatch]
  Batch --> Receipt[Receipt proof]
```

The public chain only receives `shipmentCommitment`, `merkleRoot`, counts, compact flags, a data availability hash, and a timestamp bucket.

## Deployment Topology

```mermaid
flowchart LR
  Vercel[Vercel<br/>Next.js app + API]
  Supabase[Supabase Cloud<br/>Postgres + Realtime]
  Worker[Local/Railway/Fly Worker<br/>Chain Agent]
  Monad[Monad Testnet<br/>SentinelEvidenceLedger]
  Browser[Audience browsers]

  Browser --> Vercel
  Vercel --> Supabase
  Worker --> Supabase
  Worker --> Monad
  Vercel -. receipt reads .-> Monad
```

For hackathon reliability, run the Chain Agent locally or on a small worker host. It does not require public inbound traffic.

## Failure Modes and Fallbacks

- Bad indoor GPS: dashboard uses indoor spatialization while still signing real telemetry.
- Motion unavailable: phone shows a manual tamper button.
- Supabase unavailable: local simulation controls still demonstrate the command center.
- Monad RPC delayed: dashboard keeps showing signed/live state and marks chain batches pending.
- `CHAIN_DISABLED=true`: tx hashes are simulated and explicitly labeled as simulated.

## Viewport Modes

```mermaid
flowchart LR
  Indoor[Indoor Command Room<br/>default hackathon mode]
  Geo[Geo Map<br/>MapLibre GPS mode]
  Globe[Global Threat View<br/>route and cargo lane storytelling]
  Dashboard[Command Center]

  Dashboard --> Indoor
  Dashboard --> Geo
  Dashboard --> Globe
```

Indoor mode is the default because real GPS is unreliable inside event spaces.
