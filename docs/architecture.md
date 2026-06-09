# Architecture

Monad Sentinel is a privacy-preserving evidence layer for logistics telemetry platforms. It does not replace shipment-visibility systems, IoT trackers, TMS/WMS products, or cold-chain dashboards. It sits underneath them and makes their telemetry privately verifiable.

## Strategic Context

```mermaid
flowchart LR
  subgraph Existing["Existing logistics stack"]
    Trackers[IoT trackers<br/>GPS · temp · shock · seal]
    Platforms[Visibility / cold-chain / TMS platforms]
    Claims[Insurance, compliance, audit workflows]
  end

  Sentinel[Monad Sentinel<br/>private evidence layer]
  Supabase[(Encrypted off-chain store<br/>Supabase/Postgres)]
  Monad[(Monad<br/>public root commitments)]
  Receipts[Selective reveal receipts]

  Trackers --> Platforms
  Platforms -->|sensor events / APIs / EPCIS feeds| Sentinel
  Sentinel --> Supabase
  Sentinel --> Monad
  Sentinel --> Receipts
  Receipts --> Claims
```

The customer story:

```txt
Visibility platforms show what happened.
Monad Sentinel proves the evidence was not silently rewritten.
```

## Runtime Systems

Sentinel is built as five synchronized systems:

1. **Human-facing demo system:** landing page, QR join, mobile permission flow, command center, sounds, simulation controls.
2. **Realtime telemetry system:** phone/sensor events through Next.js API, Supabase Broadcast, and dashboard state.
3. **Private evidence system:** encrypted payloads, salted commitments, EIP-712 signatures, hash-linked events, Merkle proofs, receipts.
4. **Monad evidence system:** compact batch roots committed to `SentinelEvidenceLedger` and verified through RPC/contract reads.
5. **Demo reliability system:** indoor spatialization, simulated witnesses, presenter movement controls, and 30-minute demo data cleanup.

```mermaid
flowchart TB
  subgraph Browser["Browser clients"]
    Landing[Landing page]
    Dashboard[Dashboard<br/>command center]
    Mobile[Mobile witness<br/>permission ceremony]
    Journey[Shipment journey<br/>MapLibre/OSM view]
    Receipt[Receipt verifier]
  end

  subgraph Vercel["Next.js app on Vercel"]
    Sessions[/api/sessions/]
    SessionRead[/api/session/:sessionId/]
    Telemetry[/api/telemetry/batch/]
    Emergency[/api/chain/emergency-commit/]
    Verify[/api/chain/verify-batch/]
    Simulate[/api/simulate/*/]
    Narrate[/api/agent/narrate/]
  end

  subgraph Supabase
    Postgres[(Postgres<br/>encrypted evidence + app state)]
    Broadcast[Realtime Broadcast<br/>telemetry / alerts / chain]
    Presence[Presence<br/>online / offline only]
  end

  subgraph Worker["Long-running worker"]
    ChainAgent[Chain Agent<br/>poll · Merkle · commit · verify]
  end

  subgraph Chain["Monad"]
    Ledger[SentinelEvidenceLedger]
  end

  Landing --> Sessions
  Dashboard --> SessionRead
  Dashboard --> Emergency
  Dashboard --> Simulate
  Mobile --> Telemetry
  Telemetry --> Postgres
  Telemetry --> Broadcast
  Telemetry --> Presence
  Broadcast --> Dashboard
  Presence --> Dashboard
  Journey --> Postgres
  Receipt --> Verify
  Verify --> Postgres
  Verify --> Ledger
  ChainAgent --> Postgres
  ChainAgent --> Ledger
  ChainAgent --> Broadcast
  Narrate --> Dashboard
```

## Data Plane

```mermaid
sequenceDiagram
  participant Sensor as Phone / IoT feed
  participant API as Telemetry API
  participant DB as Supabase Postgres
  participant RT as Supabase Broadcast
  participant Agent as Chain Agent
  participant Monad as SentinelEvidenceLedger
  participant UI as Dashboard / Receipt

  Sensor->>Sensor: canonicalize, hash, sign event
  Sensor->>API: POST batch with join token + signature
  API->>API: validate token, recompute hash, recover signer
  API->>API: encrypt payload, salt commitment, score risk
  API->>DB: insert telemetry_events
  API->>RT: telemetry.accepted / risk.alert
  RT->>UI: update live state
  Agent->>DB: poll unbatched events
  Agent->>Agent: build Merkle root + proofs
  Agent->>DB: insert telemetry_batches + merkle_proofs
  alt real chain mode
    Agent->>Monad: commitBatch(root, count, flags, time bucket)
    Monad-->>Agent: receipt
    Agent->>DB: store tx hash, block, status
  else simulated mode
    Agent->>DB: mark batch simulated
  end
  Agent->>RT: chain.batch.committed
  UI->>Monad: batchRoot read through verify endpoint
```

## Trust Boundaries

```mermaid
flowchart TB
  Browser[Browser / phone<br/>untrusted input]
  API[Server API<br/>validates + signs DB writes]
  DB[(Supabase<br/>availability + query layer)]
  Contract[(Monad contract<br/>integrity anchor)]
  Auditor[Auditor / receipt verifier]

  Browser -->|signed telemetry; still untrusted| API
  API -->|verified rows| DB
  DB -->|selected event + proof| Auditor
  Contract -->|batchRoot| Auditor
  Auditor -->|accepts only if proof matches root| Verdict[Verified or failed]
```

Important distinction:

- **Integrity:** device signatures, previous-event hashes, Merkle proofs, Monad `batchRoot`.
- **Confidentiality:** AES-GCM encrypted payloads and no raw telemetry on-chain.
- **Availability:** Supabase today; production can replicate encrypted blobs to WORM/object/content-addressed storage.

## Supabase vs Monad

Supabase stores high-frequency state:

- sessions and join/dashboard tokens
- devices and presence
- encrypted telemetry events
- incidents and agent actions
- Merkle proofs and batch rows
- shipments, route policies, journey segments, delivery proofs

Monad stores compact public commitments:

- shipment commitments
- route/destination policy commitments
- Merkle roots by sequence
- incident evidence hashes
- delivery confirmation hashes

Supabase is not the trust anchor. If a row is edited after commitment, the receipt proof fails against the Monad root.

## Chain Verification

Explorer links are convenience only. Internal verification uses RPC and contract state:

```mermaid
flowchart TB
  Row[telemetry_batches row]
  Disabled{CHAIN_DISABLED=true<br/>or status simulated?}
  Tx[Fetch tx receipt<br/>eth_getTransactionReceipt]
  Decode[Decode BatchCommitted log]
  Contract[Read batchRoot(shipmentCommitment, sequence)]
  CompareLog{Log metadata matches DB?}
  CompareRoot{Contract root matches DB merkle_root?}
  Success[Mark verified]
  Sim[Simulated receipt only<br/>no explorer link]
  Fail[Pending / failed / mismatch]

  Row --> Disabled
  Disabled -->|yes| Sim
  Disabled -->|no| Tx
  Tx --> Decode
  Decode --> CompareLog
  CompareLog -->|no| Fail
  CompareLog -->|yes| Contract
  Contract --> CompareRoot
  CompareRoot -->|yes| Success
  CompareRoot -->|no| Fail
```

The implementation lives in `apps/web/app/api/chain/verify-batch/route.ts` and `apps/web/lib/chain/verification.ts`.

## Mobile Permission Flow

The mobile page requests browser sensors only from user gestures. Fallback states are explicit and not shown until a request fails or the user chooses indoor spatialization.

```mermaid
stateDiagram-v2
  [*] --> NotJoined
  NotJoined --> Joined: Join Secure Session
  Joined --> LocationRequesting: Enable Location
  LocationRequesting --> LocationGranted: getCurrentPosition + watchPosition success
  LocationRequesting --> LocationDenied: denied / unavailable / timeout
  LocationDenied --> IndoorFallback: Use indoor demo spatialization
  LocationGranted --> MotionRequesting: Enable Motion
  IndoorFallback --> MotionRequesting: Enable Motion
  MotionRequesting --> MotionGranted: DeviceMotion permission granted
  MotionRequesting --> MotionFallback: denied / unavailable
  MotionGranted --> BeaconReady
  MotionFallback --> BeaconReady
  BeaconReady --> Streaming: Start Secure Beacon
```

The helper implementation is `apps/web/lib/sensors/browserSensors.ts`.

## Demo Reliability Architecture

The demo cannot depend on perfect indoor GPS, perfect venue Wi-Fi, or every audience member granting sensor permissions. The system therefore has three input paths that converge into the same evidence pipeline.

```mermaid
flowchart TB
  Real[Real phone permissions<br/>GPS + motion when granted]
  Fallback[Phone fallback<br/>indoor spatialization + manual shock]
  Sim[Presenter simulation<br/>50 witnesses + movement scenarios]
  API[Telemetry API<br/>validate + score + store]
  Evidence[Private evidence pipeline<br/>encrypt · sign · hash-chain · Merkle]
  UI[Dashboard + journey + receipt]

  Real --> API
  Fallback --> API
  Sim --> API
  API --> Evidence
  Evidence --> UI
```

Presenter controls are deterministic scenario generators for explaining thresholds:

- road bump: shock only, no custody breach
- mishandling: repeated shock or condition risk
- likely theft: shock plus route deviation, unauthorized dwell, seal risk, or heartbeat loss
- cold-chain breach: thermal exposure over product policy
- delivery: destination geofence, dwell threshold, receiver handoff, final condition, final evidence batch

Simulated chain mode remains clearly labeled. The UI must not link simulated hashes to Monad explorers or display **Verified on Monad** unless `/api/chain/verify-batch` succeeds against RPC and contract state.

## Demo Data Retention

Audience phone telemetry is temporary demo data. For hackathon sessions, the operator should purge demo rows within 30 minutes of capture.

```mermaid
flowchart LR
  Join[Audience joins<br/>tokenized QR]
  Store[Temporary encrypted telemetry<br/>Supabase demo session]
  Present[Live pitch window]
  Cleanup[Delete demo session<br/>within 30 minutes]
  Removed[Cascaded telemetry/proofs removed]

  Join --> Store --> Present --> Cleanup --> Removed
```

This retention promise is separate from public proof anchoring:

- raw audience GPS is never written on-chain
- simulated-chain receipts are not public proof
- real-chain mode anchors only opaque Merkle roots and compact metadata
- screenshots should not expose audience routes or device identities

The current documented cleanup path is Supabase SQL deletion by demo session; automation should be treated as a pre-demo quality gate before promising unattended cleanup.

## Journey Map Layers

`/shipment/[shipmentId]` is the authorized logistics journey view. It uses MapLibre with an OpenStreetMap raster fallback and customer-authorized overlays.

```mermaid
flowchart TB
  Map[MapLibre OSM base map]
  Planned[Planned route corridor<br/>purple dashed line]
  Actual[Actual decrypted route<br/>green line]
  Deviation[Unauthorized deviation<br/>red segment]
  Stops[Stops and dwell markers<br/>cyan/red circles]
  Incidents[Shock and temperature markers]
  Destination[Destination geofence]
  Anchors[Monad batch anchor markers]

  Map --> Planned
  Map --> Actual
  Map --> Deviation
  Map --> Stops
  Map --> Incidents
  Map --> Destination
  Map --> Anchors
```

The current view can build from real telemetry rows when available and falls back to a demo route so the page always explains the concept.

## Agentic Layer

The product is agentic only where agents improve interpretation or action routing. Deterministic agents remain the safety baseline.

```mermaid
flowchart LR
  Event[Telemetry / incident event]
  Risk[Risk Agent<br/>deterministic scoring]
  Chain[Chain Agent<br/>batch + verify]
  Narrator[Narrator Agent<br/>structured summary]
  Action[Action Agent<br/>typed proposals only]
  Tools[Guarded tools<br/>read state, inspect device, propose action]
  Log[(agent_actions)]

  Event --> Risk
  Event --> Chain
  Risk --> Narrator
  Narrator --> Action
  Action --> Tools
  Tools --> Log
```

Guardrails:

- LLMs never hold private keys.
- LLMs never directly write to DB or chain.
- LLM output must be structured and bounded.
- Dangerous actions require deterministic preconditions and typed tools.
- The current app has a deterministic narration fallback in `/api/agent/narrate`.

## Deployment Topology

```mermaid
flowchart LR
  Dev[Operator laptop]
  Vercel[Vercel<br/>Next.js app + API]
  Supabase[Supabase Cloud<br/>Postgres + Realtime]
  Worker[Local/Railway/Fly worker<br/>Chain Agent]
  Monad[Monad Testnet<br/>RPC + contract]
  Phones[Audience phones]

  Dev -->|vercel deploy| Vercel
  Dev -->|supabase db push| Supabase
  Phones --> Vercel
  Vercel --> Supabase
  Worker --> Supabase
  Worker --> Monad
  Vercel -->|verify endpoint reads root| Monad
```

For hackathon reliability, the Chain Agent can run locally. It needs outbound access only.

## Failure Modes

- **Bad GPS indoors:** use indoor spatialization, still sign the event.
- **Motion permission denied:** use manual shock fallback.
- **Supabase unavailable:** local simulation still demonstrates UI; real receipts require DB.
- **Monad delayed/unconfigured:** batches remain pending or simulated, never falsely verified.
- **Explorer outage:** internal RPC verification remains the source of truth.
- **LLM unavailable:** deterministic risk and narration keep working.
