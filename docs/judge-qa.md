# Judge Q&A

## Why not put every GPS point on-chain?

We do not put raw GPS on-chain. Sentinel uses private evidence anchoring:

```txt
raw telemetry       encrypted off-chain
device event        signed by sensor key
event sequence      hash-linked
batch               Merkle root
Monad               root + compact metadata
receipt             selective reveal verification
```

The public sees proof that evidence existed and was committed, but not the route, customer, product, exact location, or temperature timeline.

## Then why use Monad at all?

Supabase is useful for realtime UX, but it is not the trust anchor. Monad anchors the Merkle root. If someone edits a telemetry row later, the selected event no longer matches the committed root.

Monad matters as a fast EVM-compatible audit rail for frequent evidence commitments. It does not make GPS faster and it does not replace the database.

## What exactly is stored on Monad?

```txt
shipmentCommitment
batchSequence
merkleRoot
sampleCount
maxRiskScore
combinedFlags
dataAvailabilityHash
timeBucket
```

Not on Monad:

```txt
exact GPS
route
temperature readings
shock waveform
device identity
product identity
customer identity
driver identity
```

## If Supabase stores the data, can an admin tamper with it?

They can delete or hide data, but they cannot silently rewrite it without breaking verification.

```txt
Integrity        signatures + hash chain + Merkle root on Monad
Confidentiality  encryption + server/customer key control
Availability     database backups / WORM / replicated encrypted blobs
Tamper evidence  receipt proof fails after modification
```

For a production availability upgrade, encrypted payloads can be replicated to S3 Object Lock, Cloudflare R2, IPFS/Filecoin, Arweave, or customer-owned storage.

## Why are phones in the demo?

Phones are sensor emulators for the room. In production, the same signed telemetry envelope works with GPS tags, BLE sensors, LoRaWAN trackers, cold-chain loggers, vehicle gateways, WMS scans, and GS1 EPCIS events.

Mapping:

```txt
phone GPS            GNSS/cellular tracker location
phone accelerometer  shock/tamper sensor
phone battery        tracker battery
QR scan              shipment provisioning
ephemeral signer     secure-element tracker key
phone shake          physical shock simulation
```

## Is a shake really theft?

No. A shake is a shock event. Theft requires combined evidence:

```txt
shock + route deviation
shock + unauthorized stop
seal break + movement
tracker silence + route anomaly
destination mismatch
missing receiver handoff
```

The dashboard exposes separate buttons for road bump, mishandling, and theft so judges can see the distinction.

## How do you know the shipment arrived?

Delivery is confirmed by policy, not GPS alone:

```txt
destination geofence entered
dwell threshold reached
receiver signs handoff
final condition check passes
final delivery evidence batch committed
```

The production contract includes `DeliveryConfirmed`.

## Can criminals infer routes from public tx timing?

Metadata leakage is real. Mitigations:

```txt
fixed cadence batching
padded batches
aggregated roots for many shipments
pseudonymous shipment commitments
delayed public incident reveal
gateway address rotation where appropriate
```

The current demo already avoids public raw locations and product names.

## Why is this different from Tive, Overhaul, Controlant, or Samsara?

Those platforms prove the market need for telemetry and supply-chain monitoring. Sentinel is not trying to replace them. It is an evidence layer that can ingest tracker data and produce private, verifiable custody receipts.

Short version:

```txt
They help you monitor.
Sentinel helps you prove.
```

## What is the ZK roadmap?

The MVP uses selective reveal receipts. Future ZK proofs can prove facts without revealing raw telemetry:

```txt
temperature stayed within 2 C to 8 C
all location buckets stayed inside route corridor
final point was inside destination geofence
no unauthorized dwell segment occurred
```

H3 route cells plus a Merkle root of allowed cells are a practical path for route-compliance proofs.
