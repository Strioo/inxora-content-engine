import "dotenv/config";
import { getAIConfig } from "./services/ai-client.js";

interface TestCandidate {
  role: string;
  model: string;
  notes: string;
}

const CANDIDATES: TestCandidate[] = [
  {
    role: "Architect (Reasoning)",
    model: "kr/claude-sonnet-5-thinking",
    notes: "Claude Sonnet 5 Thinking Reasoning",
  },
  {
    role: "Writer (Prose & Code)",
    model: "am/amanai/claude-sonnet-5",
    notes: "Claude Sonnet 5 Full Technical Writer",
  },
  {
    role: "Reviewer & Auditor",
    model: "kr/deepseek-3.2",
    notes: "DeepSeek 3.2 Ultra-Fast Auditor (1.4s)",
  },
  {
    role: "Architect / DeepSeek Alt",
    model: "am/amanai/deepseek-v4-pro",
    notes: "DeepSeek v4 Pro",
  },
  {
    role: "Writer Alt (Claude)",
    model: "ag/claude-sonnet-4-6",
    notes: "Claude Sonnet 4.6",
  },
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
      // ignore
    }
  }

  return fullContent;
}

async function pingModel(endpoint: string, apiKey: string, modelName: string) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: "Respond with exactly: OK",
          },
        ],
        stream: false,
        max_tokens: 15,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    const rawText = await res.text();

    if (!res.ok) {
      return {
        ok: false,
        duration,
        error: `HTTP ${res.status}: ${rawText.slice(0, 150)}`,
      };
    }

    try {
      const data = JSON.parse(rawText);
      const reply =
        data.choices?.[0]?.message?.content ||
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        JSON.stringify(data).slice(0, 50);

      return {
        ok: true,
        duration,
        reply: reply.trim().replace(/\n/g, " "),
      };
    } catch {
      const streamReply = parseStreamResponse(rawText);
      if (streamReply) {
        return {
          ok: true,
          duration,
          reply: streamReply.trim().replace(/\n/g, " "),
        };
      }
      return {
        ok: false,
        duration,
        error: `Unparseable response: ${rawText.slice(0, 100)}`,
      };
    }
  } catch (err: unknown) {
    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      duration,
      error: msg,
    };
  }
}

async function main() {
  const config = getAIConfig();

  console.log("=========================================================");
  console.log("🔍 Testing Router Model Compatibility & Latency");
  console.log(`📡 Endpoint : ${config.endpoint}`);
  console.log("=========================================================\n");

  if (!config.apiKey) {
    console.error("❌ Error: AI_API_KEY belum terisi di .env.");
    process.exit(1);
  }

  for (let i = 0; i < CANDIDATES.length; i++) {
    const item = CANDIDATES[i];
    process.stdout.write(
      `[${i + 1}/${CANDIDATES.length}] Testing ${item.model.padEnd(32, " ")} (${item.role})... `
    );

    const result = await pingModel(config.endpoint, config.apiKey, item.model);

    if (result.ok) {
      console.log(`✅ ONLINE (${result.duration}ms) — "${result.reply}"`);
    } else {
      console.log(`❌ ERROR (${result.duration}ms)`);
      console.log(`   └─ ${result.error}`);
    }
  }

  console.log("\n=========================================================");
  console.log("🏁 Selesai Pengujian Model.");
  console.log("=========================================================");
}

main();

