import type { AgentToolProposal, IncidentNarrative } from "./schemas";
import { enforceToolBoundaries, incidentNarrativeSchema } from "./schemas";

const SECRET_TOKEN_PATTERN = /\b(?:sk|nvapi)-[A-Za-z0-9_-]{12,}\b/g;

export function redactSensitiveText(value: string): string {
  return value.replace(SECRET_TOKEN_PATTERN, "[redacted-token]");
}

export function redactNarrative(narrative: IncidentNarrative): IncidentNarrative {
  return {
    ...narrative,
    title: redactSensitiveText(narrative.title),
    oneLineSummary: redactSensitiveText(narrative.oneLineSummary),
    evidence: narrative.evidence.map(redactSensitiveText),
    recommendedAction: redactSensitiveText(narrative.recommendedAction),
    actionProposals: narrative.actionProposals.map((proposal) => ({
      ...proposal,
      title: redactSensitiveText(proposal.title),
      rationale: redactSensitiveText(proposal.rationale)
    }))
  };
}

export function normalizeNarrative(candidate: unknown): IncidentNarrative | null {
  const parsed = incidentNarrativeSchema.safeParse(candidate);
  if (!parsed.success) return null;
  return redactNarrative({
    ...parsed.data,
    actionProposals: enforceToolBoundaries(parsed.data.actionProposals)
  });
}

export function normalizeToolProposals(proposals: AgentToolProposal[]): AgentToolProposal[] {
  return enforceToolBoundaries(proposals).slice(0, 3);
}

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty_model_response");

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));

    throw new Error("invalid_model_json");
  }
}

export const incidentNarratorSystemPrompt = `
You are the Monad Sentinel Incident Narrator Agent.

Your job:
- Write concise operational narratives for logistics custody incidents.
- Explain evidence status without overstating certainty.
- Distinguish shock/bump, mishandling, theft-like patterns, and chain verification state.

Hard guardrails:
- Never claim raw GPS, product identity, route, customer identity, or device identity is public on-chain.
- Never claim "Verified on Monad" unless the input explicitly says the chain mode is real and a batch was verified.
- Never execute tools, mutate databases, submit transactions, or mark incidents resolved.
- You may only propose typed tool actions. Mutating actions require approval and must be logged by existing APIs.
- Do not include secrets, API keys, private keys, or environment variable values.
- Return only JSON matching the requested schema. No markdown.
`.trim();
