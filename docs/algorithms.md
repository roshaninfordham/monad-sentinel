# Algorithms

This document explains the deterministic logic used by Monad Sentinel. The LLM layer is optional; these rules keep the demo explainable without an AI API key.

## Risk Classifier

Phone shaking is not treated as theft by itself. It is a **shock event**. Theft requires context such as route deviation, unauthorized dwell, seal break, or tracker silence.

```mermaid
flowchart TB
  T[Telemetry event] --> Motion[Compute motion features]
  T --> Context[Read context signals]
  Motion --> Shock{Shock or jerk high?}
  Context --> Route{Route deviation?}
  Context --> Stop{Unauthorized stop?}
  Context --> Seal{Seal opened/broken?}
  Context --> Cold{Cold-chain excursion?}
  Context --> Heartbeat{Heartbeat lost?}

  Shock -->|only shock| Bump[Road bump<br/>risk usually < 30]
  Shock -->|repeated/high energy| Handling[Mishandling<br/>risk 30-79]
  Route --> Theft[Likely theft<br/>risk 80-100]
  Stop --> Theft
  Seal --> Theft
  Heartbeat --> Theft
  Cold --> ColdChain[Cold-chain risk]
```

Implementation: `packages/shared/src/index.ts` in `classifyCustodyRisk()`.

Risk additions:

```txt
shockEnergy > threshold           +25
repeated / high-energy shock      +15
large orientation change          +10
route deviation > 25m             +35
unauthorized dwell >= 180s        +35
seal break                        +50
heartbeat lost                    +30
cold-chain exposure               +25 to +45
manual theft simulation           +55
```

Severity:

```txt
0-29    normal
30-59   watch
60-79   suspicious
80-89   tamper
90-100  critical
```

## Motion Features

```txt
accelerationMagnitude = sqrt(ax^2 + ay^2 + az^2)
jerk                  = |a_t - a_(t-1)| / deltaSeconds
shockEnergy           = sum(max(0, accelerationMagnitude - baseline)^2 * deltaSeconds)
```

```mermaid
flowchart LR
  Samples[Motion samples] --> Mag[Acceleration magnitude]
  Mag --> Jerk[Jerk peak]
  Mag --> Energy[Shock energy]
  Jerk --> Risk[Risk classifier]
  Energy --> Risk
```

Demo scenarios:

- **Bump:** shock only, no route deviation, no seal break.
- **Mishandling:** repeated shock or cold-chain fluctuation, no custody breach.
- **Theft:** shock plus route deviation, unauthorized dwell, seal break, or heartbeat loss.

## Geofence and Route Deviation

Current hackathon mode uses indoor spatialization and simple distance checks. Production route validation should use PostGIS route corridors and H3 cell commitments.

```mermaid
flowchart TB
  GPS[Private GPS point] --> Authorized{Authorized user?}
  Authorized -->|yes| Map[Full route map]
  GPS --> H3[H3 cell / corridor bucket]
  H3 --> Policy[Route policy commitment]
  Policy --> Risk[Route-deviation risk]
```

Production-ready approach:

```sql
ST_DWithin(current_point, planned_corridor, allowed_distance_meters)
```

Privacy approach:

```txt
exact GPS                encrypted off-chain
route corridor cells     committed as routePolicyCommitment
public chain             only opaque commitment
```

## Stop and Dwell Detection

A stop is created when a rolling window stays inside a radius for long enough.

```mermaid
flowchart TB
  Window[Rolling GPS window] --> Centroid[Compute centroid]
  Centroid --> Radius{All points within radius?}
  Radius -->|no| Moving[Still moving]
  Radius -->|yes| Dwell{Duration >= threshold?}
  Dwell -->|no| Moving
  Dwell -->|yes| Stop[Create StopSegment]
  Stop --> Auth{Authorized checkpoint?}
  Auth -->|yes| Normal[Authorized dwell]
  Auth -->|no| Alert[Unauthorized stop risk]
```

Default production starting point:

```txt
radius = 30 meters
minimum dwell = 180 seconds
```

Implementation: `detectStopSegment()` in `packages/shared/src/index.ts`.

## Cold-Chain Exposure

Temperature compliance should not be a single threshold crossing. The model uses degree-minutes:

```txt
exposureDegreeMinutes =
  sum(max(0, avgTemperature - maxAllowedTemperature) * deltaMinutes)
```

```mermaid
flowchart LR
  Readings[Temperature readings] --> Window[Pairwise time windows]
  Window --> Excess[Temperature excess above policy]
  Excess --> Exposure[Degree-minutes]
  Exposure --> Severity{Policy limit exceeded?}
  Severity -->|no| Watch[Minor excursion]
  Severity -->|yes| Critical[Quality review required]
```

For a pharma demo policy:

```txt
allowed range: 2 C to 8 C
minor excursion: brief reading above 8 C
critical excursion: sustained exposure degree-minutes
```

## Delivery Confirmation

GPS alone does not prove delivery. Sentinel uses a delivery proof policy.

```mermaid
flowchart TB
  Geofence[Destination geofence entered] --> Dwell[Dwell threshold reached]
  Dwell --> Receiver[Receiver signs handoff]
  Receiver --> Condition[Final seal/temp condition check]
  Condition --> Batch[Final evidence batch committed]
  Batch --> Delivered[Delivered + verified]
```

Delivery evidence:

```txt
deliveryEvidence = {
  shipmentCommitment,
  destinationCommitment,
  arrivalTime,
  dwellSeconds,
  receiverSignature,
  finalTemperatureState,
  finalSealState,
  finalBatchRoot
}
```

The contract exposes `DeliveryConfirmed` for the production path. The current UI shows the delivery proof steps on `/shipment/[shipmentId]`.
