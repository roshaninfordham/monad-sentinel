import { z } from "zod";

export const agentSeveritySchema = z.enum(["watch", "suspicious", "tamper", "critical"]);

export const incidentNarrationInputSchema = z.object({
  alias: z.string().trim().min(1).max(80).default("Mobile Witness"),
  riskScore: z.coerce.number().min(0).max(100),
  reason: z.string().trim().min(1).max(500),
  batchSequence: z.coerce.number().int().positive().optional(),
  eventClass: z.string().trim().max(80).optional(),
  riskFlags: z.coerce.number().int().nonnegative().optional(),
  shipmentCommitment: z.string().trim().max(90).optional(),
  devicePseudonym: z.string().trim().max(90).optional(),
  telemetryDigest: z.array(z.string().trim().max(160)).max(6).optional(),
  chainMode: z.enum(["real", "simulated", "disabled"]).optional()
});

export const agentToolNameSchema = z.enum([
  "getSessionState",
  "inspectDevice",
  "generateIncidentNarrative",
  "commitEmergencyBatch",
  "quarantineDevice",
  "generateReceipt",
  "focusDashboardCamera"
]);

export const agentToolProposalSchema = z.object({
  tool: agentToolNameSchema,
  title: z.string().trim().min(1).max(80),
  rationale: z.string().trim().min(1).max(180),
  input: z.record(z.unknown()).default({}),
  risk: z.enum(["low", "medium", "high"]).default("low"),
  requiresApproval: z.boolean().optional().transform(() => true),
  mutatesState: z.boolean().optional().default(false)
});

export const incidentNarrativeSchema = z.object({
  severity: agentSeveritySchema,
  title: z.string().trim().min(1).max(80),
  oneLineSummary: z.string().trim().min(1).max(220),
  evidence: z.array(z.string().trim().min(1).max(160)).min(1).max(4),
  recommendedAction: z.string().trim().min(1).max(160),
  confidence: z.coerce.number().min(0).max(1),
  actionProposals: z.array(agentToolProposalSchema).max(3).default([])
});

export type IncidentNarrationInput = z.infer<typeof incidentNarrationInputSchema>;
export type IncidentNarrative = z.infer<typeof incidentNarrativeSchema>;
export type AgentToolName = z.infer<typeof agentToolNameSchema>;
export type AgentToolProposal = z.infer<typeof agentToolProposalSchema>;

export type ToolBoundary = {
  mutatesState: boolean;
  requiresApproval: boolean;
  description: string;
};

export const toolBoundaries: Record<AgentToolName, ToolBoundary> = {
  getSessionState: {
    mutatesState: false,
    requiresApproval: false,
    description: "Read summarized session state for narration or operator context."
  },
  inspectDevice: {
    mutatesState: false,
    requiresApproval: false,
    description: "Read recent telemetry and risk state for one device."
  },
  generateIncidentNarrative: {
    mutatesState: false,
    requiresApproval: false,
    description: "Generate a concise incident explanation."
  },
  commitEmergencyBatch: {
    mutatesState: true,
    requiresApproval: true,
    description: "Request immediate evidence anchoring through an existing guarded API."
  },
  quarantineDevice: {
    mutatesState: true,
    requiresApproval: true,
    description: "Mark a suspicious device as quarantined through an existing guarded API."
  },
  generateReceipt: {
    mutatesState: true,
    requiresApproval: true,
    description: "Create or open a selective reveal receipt through an existing guarded API."
  },
  focusDashboardCamera: {
    mutatesState: false,
    requiresApproval: false,
    description: "Ask the dashboard to focus the viewport on an incident device."
  }
};

export function enforceToolBoundaries(proposals: AgentToolProposal[]): AgentToolProposal[] {
  return proposals.map((proposal) => {
    const boundary = toolBoundaries[proposal.tool];
    return {
      ...proposal,
      mutatesState: boundary.mutatesState,
      requiresApproval: boundary.requiresApproval || boundary.mutatesState
    };
  });
}
