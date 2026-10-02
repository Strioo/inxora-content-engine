import "dotenv/config";
import { getAIConfig } from "./services/ai-client.js";

async function listModels() {
  const config = getAIConfig();

  if (!config.apiKey) {
    console.error("❌ Error: AI_API_KEY masih kosong di .env.");
    console.log("👉 Silakan isi AI_API_KEY di file .env terlebih dahulu, lalu jalankan kembali perintah ini.");
    process.exit(1);
  }

  // Derive /v1/models endpoint from AI_ENDPOINT
  let modelsEndpoint = config.endpoint;
  if (modelsEndpoint.endsWith("/chat/completions")) {
    modelsEndpoint = modelsEndpoint.replace("/chat/completions", "/models");
  } else if (!modelsEndpoint.endsWith("/models")) {
    modelsEndpoint = modelsEndpoint.replace(/\/+$/, "") + "/v1/models";
  }

  console.log("=========================================================");
  console.log(`📡 Menghubungi Router: ${modelsEndpoint}`);
  console.log("=========================================================");

  try {
    const res = await fetch(modelsEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`❌ Gagal mengambil daftar model (HTTP ${res.status}):`);
      console.error(errBody);
      process.exit(1);
    }

    const data = await res.json();
    const modelsList: string[] = [];

    if (Array.isArray(data.data)) {
      data.data.forEach((m: { id: string }) => {
        if (m.id) modelsList.push(m.id);
      });
    } else if (Array.isArray(data.models)) {
      data.models.forEach((m: { name?: string; id?: string }) => {
        modelsList.push(m.id || m.name || JSON.stringify(m));
      });
    } else if (Array.isArray(data)) {
      data.forEach((m: { id?: string; name?: string }) => {
        modelsList.push(m.id || m.name || String(m));
      });
    }

    console.log(`🎉 Berhasil menemukan ${modelsList.length} model:\n`);
    modelsList.sort().forEach((modelId, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2, " ")}. ${modelId}`);
    });
    console.log("\n=========================================================");
    console.log("💡 Anda bisa memasukkan nama model di atas ke variabel:");
    console.log("   AI_MODEL, AI_MODEL_ARCHITECT, AI_MODEL_WRITER, AI_MODEL_REVIEWER");
    console.log("=========================================================");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Terjadi kesalahan jaringan saat menghubungi ${modelsEndpoint}:`, msg);
    process.exit(1);
  }
}

listModels();

