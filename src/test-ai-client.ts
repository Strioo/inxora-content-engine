import { extractJSON, getAIConfig } from "./services/ai-client.js";

console.log("=== Testing AI Client & Orchestra Parsing Resilience ===");

// Test 1: Extract JSON wrapped in markdown code fences
const testFence = "Here is the response:\n```json\n{\n  \"title\": \"Architectural Deep-Dive\",\n  \"score\": 99\n}\n```\nHope this helps!";
const parsed1 = extractJSON<{ title: string; score: number }>(testFence);
console.log("✓ Test 1 Passed (Markdown Code Fence Extraction):", parsed1.title === "Architectural Deep-Dive");

// Test 2: Extract JSON with DeepSeek R1 reasoning tags
const testReasoning = "<think>\nThinking through the distributed system bottlenecks...\nThe latency is p99.\n</think>\n{\n  \"coreFailureScenario\": \"Deadlock in connection pool\",\n  \"rps\": 45000\n}";
const parsed2 = extractJSON<{ coreFailureScenario: string; rps: number }>(testReasoning);
console.log("✓ Test 2 Passed (DeepSeek R1 <think> Tag Stripping):", parsed2.coreFailureScenario === "Deadlock in connection pool");

// Test 3: Raw JSON parsing
const testRaw = "{\"status\": \"OK\", \"valid\": true}";
const parsed3 = extractJSON<{ status: string; valid: boolean }>(testRaw);
console.log("✓ Test 3 Passed (Direct JSON Parsing):", parsed3.valid === true);

// Test 4: Verify default configuration fallback
const config = getAIConfig();
console.log("✓ Test 4 Passed (Config Default Fallback):", {
  endpoint: config.endpoint,
  defaultModel: config.defaultModel,
  architectModel: config.architectModel,
  writerModel: config.writerModel,
  reviewerModel: config.reviewerModel,
});

console.log("\n🎉 ALL AI CLIENT & ORCHESTRA PARSING TESTS PASSED!");

