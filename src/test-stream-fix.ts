import "dotenv/config";
import { getAIConfig } from "./services/ai-client.js";

const TEST_MODELS = [
  "kr/claude-sonnet-5-thinking",
  "do/deepseek-v4-pro",
  "am/amanai/claude-sonnet-5",
  "am/amanai/deepseek-v4-pro",
  "z-ai/qwen-plus",
  "cbai/deepseek-v4-pro",
  "am/amanai/gpt-5.4",
  "kr/deepseek-3.2",
  "ag/claude-sonnet-4-6",
];

function parseStreamResponse(rawText: string): string {
  const lines = rawText.split("\n");
  let fullContent = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) continue;
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === "[DONE]") break;

    try {
      const parsed = JSON.parse(dataStr);
      const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
      fullContent += delta;
    } catch {
      // ignore unparseable chunk
    }
  }

  return fullContent;
}

async function testModelWithStreamFalse(model: string) {
  const config = getAIConfig();
  const startTime = Date.now();

  try {
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Katakan: READY" }],
        stream: false,
        max_tokens: 20,
      }),
    });

    const duration = Date.now() - startTime;
    const rawText = await res.text();

    if (!res.ok) {
      return { ok: false, duration, error: `HTTP ${res.status}: ${rawText.slice(0, 100)}` };
    }

    // Try standard JSON parse
    try {
      const data = JSON.parse(rawText);
      const content = data.choices?.[0]?.message?.content || JSON.stringify(data).slice(0, 40);
      return { ok: true, duration, mode: "JSON", content: content.trim() };
    } catch {
      // Try SSE Stream parsing
      const streamContent = parseStreamResponse(rawText);
      if (streamContent) {
        return { ok: true, duration, mode: "SSE-Stream", content: streamContent.trim() };
      }
      return { ok: false, duration, error: `Unparseable response: ${rawText.slice(0, 100)}` };
    }
  } catch (err: unknown) {
    return { ok: false, duration: Date.now() - startTime, error: String(err) };
  }
}

async function main() {
  const config = getAIConfig();
  console.log("=== Testing Stream-Resilient Router Models ===");
  console.log(`Endpoint: ${config.endpoint}\n`);

  for (const model of TEST_MODELS) {
    process.stdout.write(`Testing ${model.padEnd(32, " ")}... `);
    const result = await testModelWithStreamFalse(model);
    if (result.ok) {
      console.log(`✅ ONLINE [${result.mode}] (${result.duration}ms) -> "${result.content}"`);
    } else {
      console.log(`❌ FAILED (${result.duration}ms) -> ${result.error}`);
    }
  }
}

main();

