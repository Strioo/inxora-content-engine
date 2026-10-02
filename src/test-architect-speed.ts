import "dotenv/config";
import { createChatCompletion } from "./services/ai-client.js";

async function test(model: string) {
  const start = Date.now();
  try {
    const res = await createChatCompletion([
      { role: "system", content: "You are an architect. Output JSON: {\"summary\": \"test\"}" },
      { role: "user", content: "Generate blueprint for Database Migration with quantitative SLAs" }
    ], {
      model,
      timeoutMs: 30000
    });
    console.log(`[SUCCESS] ${model} finished in ${Date.now() - start}ms: ${res.slice(0, 80)}...`);
  } catch (err: any) {
    console.log(`[FAIL] ${model} failed in ${Date.now() - start}ms: ${err.message}`);
  }
}

async function run() {
  await test("cx/gpt-6-luna");
  await test("am/amanai/gpt-6-luna");
  await test("ag/gemini-3.8-flash-high");
}

run();

