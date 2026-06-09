import type { AgentToolProposal, IncidentNarrationInput, IncidentNarrative } from "./schemas";
import { normalizeToolProposals } from "./guardrails";

function severityForRisk(riskScore: number): IncidentNarrative["severity"] {
  if (riskScore >= 90) return "critical";
  if (riskScore >= 80) return "tamper";
  if (riskScore >= 60) return "suspicious";
  return "watch";
}

function titleFor(input: IncidentNarrationInput, severity: IncidentNarrative["severity"]): string {
  const eventClass = input.eventClass?.toLowerCase() ?? "";
  if (eventClass.includes("theft")) return "Likely theft pattern";
  if (eventClass.includes("mishandling")) return "Handling risk detected";
  if (eventClass.includes("bump")) return "Road shock detected";
  if (eventClass.includes("cold")) return "Cold-chain risk detected";
  if (severity === "critical") return "Critical custody anomaly";
  if (severity === "tamper") return "Tamper-risk event detected";
  if (severity === "suspicious") return "Suspicious custody signal";
  return "Custody watch signal";
}

function recommendedActionFor(input: IncidentNarrationInput, severity: IncidentNarrative["severity"]): string {
  const eventClass = input.eventClass?.toLowerCase() ?? "";
  if (eventClass.includes("bump")) return "Keep shipment moving and inspect packaging at the next planned checkpoint.";
  if (eventClass.includes("mishandling")) return "Flag packaging for inspection and keep custody handoff under review.";
  if (eventClass.includes("theft") || severity === "critical") return "Quarantine the custody handoff and request an emergency evidence batch.";
  if (eventClass.includes("cold")) return "Review product quality policy and prepare a selective reveal receipt.";
  return "Monitor the witness and include the event in the next evidence batch.";
}

function proposalFor(input: IncidentNarrationInput, severity: IncidentNarrative["severity"]): AgentToolProposal[] {
  const proposals: AgentToolProposal[] = [
    {
      tool: "inspectDevice",
      title: "Inspect witness telemetry",
      rationale: `Review recent signed events for ${input.alias}.`,
      input: {
        alias: input.alias,
        devicePseudonym: input.devicePseudonym,
        shipmentCommitment: input.shipmentCommitment
      },
      risk: "low",
      requiresApproval: false,
      mutatesState: false
    }
  ];

  if (input.batchSequence) {
    proposals.push({
      tool: "generateReceipt",
      title: "Prepare evidence receipt",
      rationale: `Batch #${input.batchSequence} can be used for selective reveal verification.`,
      input: {
        batchSequence: input.batchSequence,
        shipmentCommitment: input.shipmentCommitment
      },
      risk: "medium",
      requiresApproval: true,
      mutatesState: true
    });
  }

  if (severity === "tamper" || severity === "critical") {
    proposals.push({
      tool: "commitEmergencyBatch",
      title: "Request emergency batch",
      rationale: "High-risk custody evidence should be anchored as soon as the guarded chain agent allows it.",
      input: {
        reason: input.reason,
        riskScore: input.riskScore,
        shipmentCommitment: input.shipmentCommitment
      },
      risk: "high",
      requiresApproval: true,
      mutatesState: true
    });
  }

  return normalizeToolProposals(proposals);
}

export function createDeterministicNarrative(input: IncidentNarrationInput): IncidentNarrative {
  const severity = severityForRisk(input.riskScore);
  const batchText = input.batchSequence
    ? ` It is associated with evidence batch #${input.batchSequence}.`
    : " It is queued for the next evidence batch.";
  const chainText =
    input.chainMode === "simulated"
      ? " Chain mode is simulated, so no real Monad verification is claimed."
      : input.chainMode === "disabled"
        ? " Chain anchoring is disabled for this run."
        : "";

  return {
    severity,
    title: titleFor(input, severity),
    oneLineSummary: `${input.alias} triggered ${input.reason}.${batchText}${chainText}`,
    evidence: [
      `Risk score ${Math.round(input.riskScore)}`,
      input.reason,
      input.batchSequence ? `Batch #${input.batchSequence}` : "Evidence queued for next batch",
      input.chainMode === "real" ? "Eligible for Monad root verification" : "Local private proof path active"
    ],
    recommendedAction: recommendedActionFor(input, severity),
    confidence: severity === "watch" ? 0.72 : severity === "suspicious" ? 0.82 : 0.9,
    actionProposals: proposalFor(input, severity)
  };
}
