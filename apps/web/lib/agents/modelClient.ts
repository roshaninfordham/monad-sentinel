export type AgentModelPurpose = "default" | "reasoning" | "fast" | "safety";

export type AgentModelConfig =
  | {
      enabled: true;
      baseUrl: string;
      apiKey: string;
      model: string;
    }
  | {
      enabled: false;
      reason: string;
    };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  purpose?: AgentModelPurpose;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json";
  timeoutMs?: number;
};

function isEnabled(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

function modelForPurpose(purpose: AgentModelPurpose): string | undefined {
  if (purpose === "reasoning") return process.env.AI_REASONING_MODEL || process.env.AI_MODEL;
  if (purpose === "fast") return process.env.AI_FAST_MODEL || process.env.AI_MODEL;
  if (purpose === "safety") return process.env.AI_SAFETY_MODEL || process.env.AI_FAST_MODEL || process.env.AI_MODEL;
  return process.env.AI_MODEL;
}

export function getAgentModelConfig(purpose: AgentModelPurpose = "default"): AgentModelConfig {
  if (!isEnabled(process.env.AI_ENABLED)) {
    return { enabled: false, reason: "AI_ENABLED is not true" };
  }

  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = modelForPurpose(purpose)?.trim();

  if (!baseUrl) return { enabled: false, reason: "AI_BASE_URL is not configured" };
  if (!apiKey) return { enabled: false, reason: "AI_API_KEY is not configured" };
  if (!model) return { enabled: false, reason: "AI_MODEL is not configured" };

  return {
    enabled: true,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    model
  };
}

function completionEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function messageContentFromResponse(payload: unknown): string {
  const candidate = payload as {
    choices?: Array<{
      message?: { content?: unknown };
      delta?: { content?: unknown };
    }>;
  };

  const content = candidate.choices?.[0]?.message?.content ?? candidate.choices?.[0]?.delta?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("missing_model_content");
  }
  return content;
}

async function requestChatCompletion(
  config: Extract<AgentModelConfig, { enabled: true }>,
  options: ChatCompletionOptions,
  includeJsonFormat: boolean
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

  try {
    const response = await fetch(completionEndpoint(config.baseUrl), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1200,
        ...(includeJsonFormat ? { response_format: { type: "json_object" } } : {})
      })
    });

    if (!response.ok) {
      throw new Error(`model_http_${response.status}`);
    }

    return messageContentFromResponse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

export async function createOpenAICompatibleChatCompletion(options: ChatCompletionOptions): Promise<{
  content: string;
  model: string;
}> {
  const config = getAgentModelConfig(options.purpose);
  if (!config.enabled) {
    throw new Error(config.reason);
  }

  try {
    return {
      content: await requestChatCompletion(config, options, options.responseFormat === "json"),
      model: config.model
    };
  } catch (error) {
    if (options.responseFormat !== "json") throw error;

    return {
      content: await requestChatCompletion(config, options, false),
      model: config.model
    };
  }
}
