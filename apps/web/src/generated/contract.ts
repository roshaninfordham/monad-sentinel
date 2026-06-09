export const sentinelEvidenceLedgerAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const sentinelEvidenceLedgerAbi = [
  {
    type: "event",
    name: "BatchCommitted",
    inputs: [
      { name: "sessionId", type: "bytes32", indexed: true },
      { name: "sequence", type: "uint64", indexed: true },
      { name: "merkleRoot", type: "bytes32", indexed: true },
      { name: "sampleCount", type: "uint32", indexed: false },
      { name: "maxRiskScore", type: "uint16", indexed: false },
      { name: "combinedFlags", type: "uint16", indexed: false },
      { name: "alertsRoot", type: "bytes32", indexed: false },
      { name: "firstClientTimestamp", type: "uint256", indexed: false },
      { name: "lastClientTimestamp", type: "uint256", indexed: false },
      { name: "chainTimestamp", type: "uint256", indexed: false }
    ]
  },
  {
    type: "function",
    name: "commitBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "sequence", type: "uint64" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "sampleCount", type: "uint32" },
      { name: "maxRiskScore", type: "uint16" },
      { name: "combinedFlags", type: "uint16" },
      { name: "alertsRoot", type: "bytes32" },
      { name: "firstClientTimestamp", type: "uint256" },
      { name: "lastClientTimestamp", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "batchRoot",
    stateMutability: "view",
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "sequence", type: "uint64" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
] as const;
