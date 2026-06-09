export const sentinelEvidenceLedgerAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const sentinelEvidenceLedgerAbi = [
  {
    type: "event",
    name: "ShipmentCreated",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32", indexed: true },
      { name: "authority", type: "address", indexed: true },
      { name: "routePolicyCommitment", type: "bytes32", indexed: false },
      { name: "destinationCommitment", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "BatchCommitted",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32", indexed: true },
      { name: "sequence", type: "uint64", indexed: true },
      { name: "merkleRoot", type: "bytes32", indexed: true },
      { name: "sampleCount", type: "uint32", indexed: false },
      { name: "maxRiskScore", type: "uint16", indexed: false },
      { name: "combinedFlags", type: "uint16", indexed: false },
      { name: "dataAvailabilityHash", type: "bytes32", indexed: false },
      { name: "timeBucket", type: "uint256", indexed: false },
      { name: "chainTimestamp", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "DeliveryConfirmed",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32", indexed: true },
      { name: "deliveryEvidenceHash", type: "bytes32", indexed: true },
      { name: "receiverCommitment", type: "bytes32", indexed: false },
      { name: "batchSequence", type: "uint64", indexed: false },
      { name: "chainTimestamp", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "createShipment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32" },
      { name: "routePolicyCommitment", type: "bytes32" },
      { name: "destinationCommitment", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "commitBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32" },
      { name: "sequence", type: "uint64" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "sampleCount", type: "uint32" },
      { name: "maxRiskScore", type: "uint16" },
      { name: "combinedFlags", type: "uint16" },
      { name: "dataAvailabilityHash", type: "bytes32" },
      { name: "timeBucket", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "confirmDelivery",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32" },
      { name: "deliveryEvidenceHash", type: "bytes32" },
      { name: "receiverCommitment", type: "bytes32" },
      { name: "batchSequence", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "batchRoot",
    stateMutability: "view",
    inputs: [
      { name: "shipmentCommitment", type: "bytes32" },
      { name: "sequence", type: "uint64" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
] as const;
