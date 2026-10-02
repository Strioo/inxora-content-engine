import { jsonrepair } from "jsonrepair";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  fallbackModel?: string;
}

export interface AIClientConfig {
  apiKey?: string;
  endpoint: string;
  defaultModel: string;
  researcherModel: string;
  architectModel: string;
  writerModel: string;
  reviewerModel: string;
  reviewerFallbackModel: string;
}

export function getAIConfig(): AIClientConfig {
  const apiKey =
    process.env.AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  const endpoint =
    process.env.AI_ENDPOINT?.trim() ||
    "https://api.openai.com/v1/chat/completions";

  const defaultModel =
    process.env.AI_MODEL?.trim() || "gpt-4o";

  const researcherModel =
    process.env.AI_MODEL_RESEARCHER?.trim() || defaultModel;

  const architectModel =
    process.env.AI_MODEL_ARCHITECT?.trim() || defaultModel;

  const writerModel =
    process.env.AI_MODEL_WRITER?.trim() || defaultModel;

  const reviewerModel =
    process.env.AI_MODEL_REVIEWER?.trim() || defaultModel;

  const reviewerFallbackModel =
    process.env.AI_MODEL_REVIEWER_FALLBACK?.trim() || defaultModel;

  return {
    apiKey,
    endpoint,
    defaultModel,
    researcherModel,
    architectModel,
    writerModel,
    reviewerModel,
    reviewerFallbackModel,
  };
}

function sanitizeJsonString(str: string): string {
  let inString = false;
  let escaped = false;
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      out += char;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      out += char;
      continue;
    }
    if (inString) {
      if (char === "\n") {
        out += "\\n";
        continue;
      }
      if (char === "\r") {
        out += "\\r";
        continue;
      }
      if (char === "\t") {
        out += "\\t";
        continue;
      }
      const code = char.charCodeAt(0);
      if (code < 32) {
        out += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
    }
    out += char;
  }
  return out;
}

/**
 * Fixes unescaped double quotes inside HTML tag attributes,
 * e.g. <div class="foo"> -> <div class=\"foo\">
 * without touching already-escaped quotes like class=\"foo\".
 */
function fixHtmlAttributeQuotes(text: string): string {
  return text.replace(/<[a-zA-Z][a-zA-Z0-9:-]*\b([^>]*)>/g, (tag) => {
    return tag.replace(/(\b[a-zA-Z0-9_-]+=)(?<!\\)"([^"\\]*?)(?<!\\)"/g, '$1\\"$2\\"');
  });
}

/**
 * Extracts and cleans JSON object from raw LLM output.
 * Handles markdown code fences, reasoning tags, jsonrepair, HTML attribute quotes,
 * unquoted keys, trailing commas, and unescaped control characters.
 */
export function extractJSON<T = unknown>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip reasoning tags if present (e.g. from DeepSeek R1 / thinking models)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown code fences if wrapped
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else if (/^```(?:json)?/i.test(cleaned)) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // 1. Attempt direct JSON parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Proceed to repair strategies
  }

  function tryParseWithRepair(str: string): T | null {
    // a. Standard jsonrepair
    try {
      return JSON.parse(jsonrepair(str)) as T;
    } catch {
      // ignore
    }

    // b. Fix unescaped HTML attribute quotes + jsonrepair
    try {
      const fixedHtml = fixHtmlAttributeQuotes(str);
      return JSON.parse(jsonrepair(fixedHtml)) as T;
    } catch {
      // ignore
    }

    // c. Sanitize control characters + jsonrepair
    try {
      const sanitized = sanitizeJsonString(str);
      return JSON.parse(jsonrepair(sanitized)) as T;
    } catch {
      // ignore
    }

    // d. Fix HTML attribute quotes + sanitize control chars + jsonrepair
    try {
      const fixedBoth = sanitizeJsonString(fixHtmlAttributeQuotes(str));
      return JSON.parse(jsonrepair(fixedBoth)) as T;
    } catch {
      // ignore
    }

    // e. Sanitize control characters + standard JSON.parse
    try {
      return JSON.parse(sanitizeJsonString(str)) as T;
    } catch {
      // ignore
    }

    return null;
  }

  // 2. If cleaned starts with { or [, attempt jsonrepair on cleaned
  if (cleaned.startsWith("{") || cleaned.startsWith("[")) {
    const repaired = tryParseWithRepair(cleaned);
    if (repaired !== null) {
      return repaired;
    }
  }

  // 3. Fallback: extract substring between first '{' and last '}'
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1) {
    const endIdx = lastBrace !== -1 && lastBrace > firstBrace ? lastBrace + 1 : undefined;
    const jsonCandidate = cleaned.slice(firstBrace, endIdx);
    try {
      return JSON.parse(jsonCandidate) as T;
    } catch {
      const repairedCandidate = tryParseWithRepair(jsonCandidate);
      if (repairedCandidate !== null) {
        return repairedCandidate;
      }
    }
  }

  // Fallback: extract substring between first '[' and last ']'
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1) {
    const endIdx = lastBracket !== -1 && lastBracket > firstBracket ? lastBracket + 1 : undefined;
    const arrayCandidate = cleaned.slice(firstBracket, endIdx);
    try {
      return JSON.parse(arrayCandidate) as T;
    } catch {
      const repairedArray = tryParseWithRepair(arrayCandidate);
      if (repairedArray !== null) {
        return repairedArray;
      }
    }
  }

  // 4. Last attempt on cleaned even if it did not start with { or [
  const lastResort = tryParseWithRepair(cleaned);
  if (lastResort !== null) {
    return lastResort;
  }

  throw new Error(`Failed to extract valid JSON from LLM output: ${cleaned.slice(0, 200)}...`);
}

/**
 * Universal OpenAI-compatible chat completion client with retry backoff and local LLM support.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const config = getAIConfig();

  const isLocalEndpoint =
    config.endpoint.includes("localhost") ||
    config.endpoint.includes("127.0.0.1") ||
    config.endpoint.includes("0.0.0.0") ||
    config.endpoint.includes("::1");

  if (!config.apiKey && !isLocalEndpoint) {
    throw new Error("Missing AI_API_KEY. Configure AI_API_KEY or AI_ENDPOINT in .env");
  }

  const model = options.model || config.defaultModel || "gpt-4o";
  const temperature = options.temperature ?? 0.7;
  const timeoutMs = options.timeoutMs ?? 75000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response | null = null;
    let delay = 1500;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      res = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          stream: false,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
        }),
        signal: controller.signal,
      });

      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        console.warn(`  ⚠️ AI Provider returned HTTP ${res.status}. Backing off for ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      break;
    }

    clearTimeout(timeoutId);

    if (!res || !res.ok) {
      const errorText = res ? await res.text() : "No response";
      throw new Error(`AI Provider returned HTTP ${res?.status || 500}: ${errorText.slice(0, 300)}`);
    }

    const rawText = await res.text();
    let data: Record<string, unknown> | null = null;

    try {
      data = JSON.parse(rawText);
    } catch {
      // Robust SSE stream fallback parser
      const lines = rawText.split("\n");
      let fullContent = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(dataStr);
          const delta =
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.message?.content ||
            "";
          fullContent += delta;
        } catch {
          // ignore
        }
      }
      if (fullContent) {
        return fullContent;
      }
      throw new Error(`Failed to parse AI response: ${rawText.slice(0, 200)}`);
    }

    // Standard OpenAI format: choices[0].message.content
    const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
    if (choices?.[0]?.message?.content) {
      return choices[0].message.content;
    }

    // Google Gemini format fallback:
    const candidates = data?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
    if (candidates?.[0]?.content?.parts?.[0]?.text) {
      return candidates[0].content.parts[0].text;
    }

    throw new Error(`Unexpected response structure from AI endpoint: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (options.fallbackModel && options.fallbackModel !== model) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠️ Primary model ${model} failed (${errMsg.slice(0, 100)}). Retrying with fallback model: ${options.fallbackModel}...`);
      return createChatCompletion(messages, {
        ...options,
        model: options.fallbackModel,
        fallbackModel: undefined,
      });
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`AI request timed out after ${timeoutMs}ms to ${config.endpoint}`);
    }
    throw err;
  }
}
