export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIClientConfig {
  apiKey?: string;
  endpoint: string;
  defaultModel: string;
  architectModel: string;
  writerModel: string;
  reviewerModel: string;
}

export function getAIConfig(): AIClientConfig {
  const apiKey =
    process.env.AI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();

  const endpoint =
    process.env.AI_ENDPOINT?.trim() ||
    "https://api.openai.com/v1/chat/completions";

  const defaultModel =
    process.env.AI_MODEL?.trim() || "gpt-4o";

  const architectModel =
    process.env.AI_MODEL_ARCHITECT?.trim() || defaultModel;

  const writerModel =
    process.env.AI_MODEL_WRITER?.trim() || defaultModel;

  const reviewerModel =
    process.env.AI_MODEL_REVIEWER?.trim() || defaultModel;

  return {
    apiKey,
    endpoint,
    defaultModel,
    architectModel,
    writerModel,
    reviewerModel,
  };
}

/**
 * Extracts and cleans JSON object from raw LLM output.
 * Handles markdown code fences (```json ... ```) and reasoning tags (<think>...</think>).
 */
export function extractJSON<T = unknown>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip reasoning tags if present (e.g. from DeepSeek R1 / thinking models)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown code fences if wrapped
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Attempt direct JSON parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract substring between first '{' and last '}'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(jsonCandidate) as T;
    }
    throw new Error(`Failed to extract valid JSON from LLM output: ${cleaned.slice(0, 200)}...`);
  }
}

/**
 * Universal OpenAI-compatible chat completion client.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const config = getAIConfig();

  if (!config.apiKey) {
    throw new Error("Missing AI_API_KEY. Configure AI_API_KEY or AI_ENDPOINT in .env");
  }

  const model = options.model || config.defaultModel || "gpt-4o";
  const temperature = options.temperature ?? 0.7;
  const timeoutMs = options.timeoutMs ?? 75000; // 75s timeout per stage

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI Provider returned HTTP ${res.status}: ${errorText.slice(0, 300)}`);
    }

    const data = await res.json();

    // Standard OpenAI format: choices[0].message.content
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    // Google Gemini format fallback (if pointing directly to generativelanguage endpoint):
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    throw new Error(`Unexpected response structure from AI endpoint: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`AI request timed out after ${timeoutMs}ms to ${config.endpoint}`);
    }
    throw err;
  }
}
