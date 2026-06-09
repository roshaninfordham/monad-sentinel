export const landingContent = {
  nav: ["How it works", "For platforms", "Privacy", "Demo"],
  hero: {
    eyebrow: "Privacy-preserving evidence for logistics telemetry",
    headline: "Make logistics telemetry provable without making it public.",
    subheadline:
      "Monad Sentinel is an evidence layer for companies that already track shipments. It turns GPS, temperature, motion, seal, and custody events into encrypted, signed, Merkle-batched proofs anchored to Monad.",
    target:
      "Built for IoT tracker companies, visibility platforms, cold-chain monitoring providers, TMS/WMS vendors, insurers, and compliance teams.",
    primaryCta: "Launch Live Proof Demo",
    secondaryCta: "View Proof Receipt",
    badges: [
      "No raw GPS on-chain",
      "Works with existing sensors",
      "Merkle evidence receipts",
      "EPCIS-ready",
      "Monad-anchored"
    ]
  },
  pipeline: {
    sensors: ["GPS", "Temperature", "Shock", "Seal", "Battery", "Handoff scan"],
    engine: ["Encrypt", "Salt", "Sign", "Hash-chain", "Risk score", "Merkle batch"],
    receipt: ["Root", "Tx", "Proof", "Verify", "Selective reveal"]
  },
  metrics: [
    {
      value: "$725M",
      label: "reported cargo theft losses",
      context: "U.S./Canada, 2025",
      source: "Cargo theft reporting describes cyber-enabled strategic theft using hacking, impersonation, and shipment diversion.",
      tone: "risk"
    },
    {
      value: "0 raw GPS",
      label: "published on-chain",
      context: "Only opaque commitments are public",
      tone: "privacy"
    },
    {
      value: "1 API",
      label: "to add proof receipts",
      context: "Sensor feeds stay in your platform",
      tone: "integration"
    },
    {
      value: "Merkle roots",
      label: "instead of per-event txs",
      context: "Scalable evidence anchoring",
      tone: "chain"
    }
  ],
  targetCustomers: [
    "IoT tracker OEMs",
    "Shipment visibility platforms",
    "Cold-chain monitoring providers",
    "TMS / WMS vendors",
    "Freight security providers",
    "Insurance and claims platforms",
    "Compliance and audit platforms"
  ],
  comparison: [
    {
      capability: "Data capture",
      existing: "GPS, temperature, shock dashboards",
      rawChain: "Not built for sensor ingestion",
      sentinel: "API/SDK ingests existing sensor feeds"
    },
    {
      capability: "Privacy",
      existing: "Private platform database",
      rawChain: "Public if raw data is posted",
      sentinel: "Encrypted off-chain, opaque on-chain"
    },
    {
      capability: "Tamper evidence",
      existing: "Platform audit logs",
      rawChain: "Immutable public data",
      sentinel: "Signed events + Merkle roots on Monad"
    },
    {
      capability: "Verification",
      existing: "Reports and exports",
      rawChain: "Public data inspection",
      sentinel: "Selective reveal receipts"
    },
    {
      capability: "Cost model",
      existing: "SaaS storage",
      rawChain: "Expensive/noisy per event",
      sentinel: "Compact batch roots"
    },
    {
      capability: "Best buyer",
      existing: "Shippers and logistics teams",
      rawChain: "Crypto-native teams",
      sentinel: "Visibility platforms and IoT providers"
    }
  ],
  threeSteps: [
    {
      title: "Capture",
      subtitle: "Connect existing sensor streams.",
      bullets: ["GPS", "temperature", "shock / motion", "seal state", "battery", "handoff scans", "EPCIS-style events"]
    },
    {
      title: "Seal",
      subtitle: "Turn raw telemetry into private evidence.",
      bullets: ["canonicalize", "encrypt", "salt", "hash-chain", "sign", "risk-score", "Merkle batch"]
    },
    {
      title: "Prove",
      subtitle: "Anchor compact evidence roots to Monad.",
      bullets: ["shipment commitment", "batch root", "event count", "risk commitment", "tx hash", "selective receipt"]
    }
  ],
  privacyShield: {
    publicOnMonad: [
      "shipment commitment",
      "batch sequence",
      "Merkle root",
      "event count",
      "risk commitment",
      "timestamp bucket",
      "tx hash"
    ],
    encryptedOffchain: [
      "exact route",
      "GPS points",
      "temperature history",
      "shock waveform",
      "device identity",
      "customer/product identity"
    ],
    authorizedDashboard: [
      "full journey map",
      "stops and dwell time",
      "condition timeline",
      "incident classification",
      "custody handoffs",
      "selective reveal receipts"
    ]
  },
  demoPreview: [
    "Launch session",
    "Scan QR",
    "Phone becomes signed sensor",
    "Shock event classified",
    "Merkle batch committed",
    "Receipt verified"
  ],
  integration: ["REST API", "Webhooks", "SDK", "EPCIS adapter", "Sensor gateway", "Receipt iframe", "Monad contract", "Verifier API"]
} as const;

export type MetricTone = (typeof landingContent.metrics)[number]["tone"];
