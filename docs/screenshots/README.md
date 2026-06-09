# Screenshot Index

Use this folder as the repo-visible product gallery. Screenshots should help a judge understand the product before opening the app.

## Current Gallery

| File | What it proves |
| --- | --- |
| `01-landing-privacy-evidence-layer.png` | The strategic pivot: evidence layer for existing logistics platforms. |
| `02-dashboard-command-center.png` | Live command center with QR, swarm state, presenter controls, and evidence rail. |
| `03-mobile-join-screen.png` | Phone onboarding as a temporary signed witness. |
| `04-mobile-permission-ceremony.png` | Explicit location/motion permission ceremony before sensor capture. |
| `05-shipment-journey-map.png` | Authorized journey view with source, destination, route, stops, incidents, and delivery policy. |
| `06-simulated-proof-receipt-guardrails.png` | Simulated-chain guardrails: no fake explorer link and no fake Monad verification. |
| `07-sample-selective-reveal-receipt.png` | Receipt anatomy: payload/signature/Merkle/root verification explanation. |
| `08-device-detail-inspector.png` | Per-witness drilldown with route progress, privacy state, incidents, and latest batch proof. |

## Real Monad Transaction Screenshot

Add a real-chain screenshot only after all of these are true:

```txt
CHAIN_DISABLED=false
NEXT_PUBLIC_CHAIN_MODE=real
MONAD_RPC_URL configured
GATEWAY_PRIVATE_KEY funded
NEXT_PUBLIC_CONTRACT_ADDRESS points to deployed SentinelEvidenceLedger
commitBatch transaction is included
/api/chain/verify-batch returns verified=true
receipt page shows the contract root matches the local Merkle root
```

Recommended filename:

```txt
09-real-monad-batch-verified.png
```

The screenshot should show either the verified receipt page, the explorer transaction, or both side-by-side. It must not be generated from simulated tx hashes.

## Capture Checklist

- Hide private participant GPS coordinates unless the screenshot uses demo data.
- Prefer a fresh demo session with simulated or consented devices.
- Show the large QR only if the join token is safe to publish or already expired.
- For simulated chain mode, keep the **Simulated receipt only** label visible.
- For real chain mode, include the tx hash and contract-root verification state.
