import { createDeterministicNarrative } from "./fallback";
import { incidentNarratorSystemPrompt, normalizeNarrative, parseJsonObject } from "./guardrails";
import { createOpenAICompatibleChatCompletion, getAgentModelConfig } from "./modelClient";
import type { IncidentNarrationInput, IncidentNarrative } from "./schemas";
import { toolBoundaries } from "./schemas";

export type NarrativeResult = IncidentNarrative & {
  deterministicFallback: boolean;
  aiAttempted: boolean;
  modelUsed: string | null;
  fallbackReason?: string;
};

function publicInputForModel(input: IncidentNarrationInput) {
  return {
    alias: input.alias,
    riskScore: input.riskScore,
    reason: input.reason,
    batchSequence: input.batchSequence,
    eventClass: input.eventClass,
    riskFlags: input.riskFlags,
    shipmentCommitment: input.shipmentCommitment,
    devicePseudonym: input.devicePseudonym,
    telemetryDigest: input.telemetryDigest,
    chainMode: input.chainMode
  };
}

function schemaInstructions(): string {
  return JSON.stringify(
    {
      severity: "watch | suspicious | tamper | critical",
      title: "string, max 80 chars",
      oneLineSummary: "string, max 220 chars",
      evidence: ["1-4 concise evidence bullets"],
      recommendedAction: "string, max 160 chars",
      confidence: "number between 0 and 1",
      actionProposals: [
        {
          tool: Object.keys(toolBoundaries).join(" | "),
          title: "string",
          rationale: "string",
          input: "object with proposal parameters only",
          risk: "low | medium | high",
          requiresApproval: true,
          mutatesState: "boolean"
        }
      ]
    },
    null,
    2
  );
}

export async function generateIncidentNarrative(input: IncidentNarrationInput): Promise<NarrativeResult> {
  const fallback = createDeterministicNarrative(input);
  const config = getAgentModelConfig("default");

  if (!config.enabled) {
    return {
      ...fallback,
      deterministicFallback: true,
      aiAttempted: false,
      modelUsed: null,
      fallbackReason: config.reason
    };
  }

  try {
    const completion = await createOpenAICompatibleChatCompletion({
      purpose: "default",
      responseFormat: "json",
      temperature: 0.2,
      maxTokens: 1200,
      messages: [
        {
          role: "system",
          content: incidentNarratorSystemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: "Generate an incident narrative and proposal-only tool actions.",
              outputSchema: schemaInstructions(),
              toolBoundaries,
              incident: publicInputForModel(input)
            },
            null,
            2
          )
        }
      ]
    });

    const normalized = normalizeNarrative(parseJsonObject(completion.content));
    if (!normalized) {
      return {
        ...fallback,
        deterministicFallback: true,
        aiAttempted: true,
        modelUsed: completion.model,
        fallbackReason: "model_response_failed_schema"
      };
    }

    return {
      ...normalized,
      deterministicFallback: false,
      aiAttempted: true,
      modelUsed: completion.model
    };
  } catch (error) {
    return {
      ...fallback,
      deterministicFallback: true,
      aiAttempted: true,
      modelUsed: config.model,
      fallbackReason: error instanceof Error ? error.message : "model_error"
    };
  }
}
