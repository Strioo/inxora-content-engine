import { ResearchPlan } from "./researcher.js";
import { buildSystemPrompt } from "../prompts/anti-slop.js";
import { INXORA_SERVICES } from "../config.js";
import { getAIConfig } from "./ai-client.js";
import { runOrchestraPipeline, PolishedArticle } from "./orchestra.js";

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  metaTitle: string;
  metaDesc: string;
  category: string;
}

/**
 * High-quality procedural technical fallback generator.
 * Produces deep, realistic, anti-slop technical articles compliant with Google HCU.
 * Produces deep, realistic, anti-slop technical articles dynamically varied by archetype and industry.
 */
function generateTechnicalDraft(plan: ResearchPlan): GeneratedArticle {
  const { topic, category, recommendedKeywords } = plan;
  const { topic, category, recommendedKeywords, archetype, industry } = plan;

  const title = topic.startsWith("Panduan") || topic.startsWith("Arsitektur") || topic.startsWith("Strategi")
    ? topic
    : `Arsitektur dan Strategi Implementasi: ${topic}`;
  // 1. Dynamic Title based on Archetype and Industry
  let title = topic;
  switch (archetype.id) {
    case "war-story":
      title = `Post-Mortem: Investigasi Latensi dan Mitigasi Kegagalan pada ${topic}`;
      break;
    case "deep-dive":
      title = `Deep-Dive Arsitektur: Membedah Mekanisme Internal ${topic}`;
      break;
    case "benchmark-battle":
      title = `Evaluasi Kritis dan Trade-Off: Strategi Implementasi ${topic} pada ${industry.name}`;
      break;
    case "production-blueprint":
      title = `Cetak Biru Produksi: Panduan Implementasi ${topic} Tahan Banting`;
      break;
    case "adr":
      title = `Architectural Decision Record: Rationale Desain ${topic} untuk Sistem Skalabel`;
      break;
    default:
      title = `Arsitektur dan Rekayasa Sistem: ${topic}`;
  }

  const excerpt = `Analisis mendalam mengenai tantangan arsitektural, optimasi performa, dan mitigasi bottleneck produksi pada ${topic.toLowerCase()}.`;
  // Ensure title is not overly repetitive
  // Ensure title length is safe for database constraints
  if (title.length > 95) {
    title = title.slice(0, 92) + "...";
  }

  const excerpt = `Analisis mendalam mengenai ${archetype.tagline.toLowerCase()} pada ${topic.toLowerCase()} dengan studi kasus spesifik pada ${industry.name.toLowerCase()}.`;

  // Pick a natural relevant service link
  const relevantService = INXORA_SERVICES.find((s) =>
    category.toLowerCase().includes(s.name.toLowerCase().slice(0, 5))
  ) || INXORA_SERVICES[2]; // Default to System Architecture
  const relevantService =
    INXORA_SERVICES.find((s) =>
      category.toLowerCase().includes(s.name.toLowerCase().slice(0, 5))
    ) || INXORA_SERVICES[2]; // Default to System Architecture

  const h2 = archetype.headingBlueprint.h2Sections;

  const content = `
<p>
  Ketika membangun sistem berskala produksi, salah satu kesalahan paling fatal adalah mengabaikan batas konkurensi dan karakteristik latensi pada arsitektur data. Pada pembahasan mengenai <strong>${topic}</strong>, kita perlu membedah secara objektif titik kegagalan (*single point of failure*) yang sering muncul saat trafik melonjak, serta solusi rekayasa yang dapat dipertahankan dalam jangka panjang.
  Ketika merancang sistem berskala enterprise di sektor <strong>${industry.name}</strong>, salah satu tantangan rekayasa yang paling kritis adalah ${industry.workloadDescription.toLowerCase()} Pada pembahasan mendalam mengenai <strong>${topic}</strong> ini, kita membedah perspektif <em>${archetype.tagline}</em> untuk memastikan sistem tidak hanya berfungsi di atas kertas, tetapi juga terbukti andal saat menghadapi beban ekstrem di lingkungan produksi.
</p>

<h2>1. Anatomi Masalah dan Hambatan Skalabilitas</h2>
<h2>${h2[0]}</h2>
<p>
  Banyak tim rekayasa perangkat lunak mengasumsikan bahwa meningkatkan kapasitas komputasi (*vertical scaling*) adalah jawaban instan. Namun, kenyataan di lapangan menunjukkan bahwa bottleneck hampir selalu berpindah ke lapisan persistensi dan alokasi resource jaringan.
  Banyak tim rekayasa perangkat lunak mengasumsikan bahwa menambah kapasitas komputasi (*vertical scaling*) atau meletakkan cache secara acak dapat menyelesaikan hambatan performa seketika. Namun, dalam ekosistem dengan beban kerja tinggi, titik kegagalan (*bottleneck*) hampir selalu berpindah ke antrian persistensi, degradasi resource jaringan, atau inkonsistensi konkurensi.
</p>
<p>
  Khusus pada lingkungan ${industry.name}, tim rekayasa sering berhadapan dengan anomali operasional seperti:
</p>
<ul>
  ${industry.typicalBottlenecks.map((b) => `<li><strong>${b}:</strong> Memerlukan penanganan arsitektural di lapisan aplikasi sebelum menyentuh storage layer.</li>`).join("\n  ")}
</ul>

<blockquote>
  <p><strong>Prinsip Arsitektur:</strong> Menambah instance komputasi tanpa optimasi konkurensi basis data hanya akan mempercepat terjadinya <em>connection pool starvation</em> dan lonjakan latensi p99.</p>
  <p><strong>${archetype.headingBlueprint.calloutTheme}:</strong> ${industry.complianceOrEdgeCase}</p>
</blockquote>

<p>
  Berikut adalah matriks perbandingan pendekatan penanganan beban pada sistem modern:
  Berikut adalah matriks komparasi evaluasi arsitektural yang dirancang untuk mengatasi hambatan tersebut:
</p>

<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">
  <thead>
    <tr style="background-color: rgba(255,255,255,0.05);">
      <th>Parameter Arsitektur</th>
      <th>Pendekatan Konvensional</th>
      <th>Arsitektur Teroptimasi (Inxora Standard)</th>
      <th>Parameter Rekayasa</th>
      <th>Pendekatan Naive / Konvensional</th>
      <th>Standar Arsitektur Inxora (${industry.name})</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Strategi Caching</strong></td>
      <td>Full Cache-Aside tanpa invalidasi presisi</td>
      <td>Multi-Tier Caching dengan Stale-While-Revalidate (SWR)</td>
      <td><strong>Ketahanan Beban (Resilience)</strong></td>
      <td>Fail-open tanpa batas batas konkurensi terukur</td>
      <td>Circuit Breaker dengan Adaptive Concurrency Limiting</td>
    </tr>
    <tr>
      <td><strong>Connection Pooling</strong></td>
      <td>Client-side pool tak terbatas</td>
      <td>Proxy Pooling terpusat dengan circuit breaker</td>
      <td><strong>Konsistensi Transaksi</strong></td>
      <td>Pessimistic blocking lock berpotensi deadlock</td>
      <td>Idempotent token with optimistic state versioning</td>
    </tr>
    <tr>
      <td><strong>Throughput Bottleneck</strong></td>
      <td>Tinggi pada latensi query I/O</td>
      <td>Dibatasi secara terprediksi dengan backpressure</td>
      <td><strong>Telemetry & Latensi p99</strong></td>
      <td>Log unformatted teks tanpa distributed tracing</td>
      <td>OpenTelemetry span context dengan alerting SLA p99</td>
    </tr>
  </tbody>
</table>

<h2>2. Implementasi Pola Desain dan Contoh Kode</h2>
<h2>${h2[1]}</h2>
<p>
  Untuk menerapkan prinsip tersebut secara konkret, pertimbangkan implementasi proteksi timeout dan deduplikasi request berikut:
  Untuk mengeliminasi risiko kegagalan sistem pada ${topic}, arsitektur modern memisahkan tanggung jawab antara <em>Command Path</em> (operasi mutasi berlatensi ketat) dan <em>Read / Projection Path</em>. Dengan cara ini, lonjakan query pembacaan tidak akan pernah mengganggu integritas transaksi kritis.
</p>

<pre><code class="language-typescript">// Contoh implementasi Circuit Breaker & Connection Guard
export async function executeResilientQuery&lt;T&gt;(
  operationName: string,
  queryFn: () => Promise&lt;T&gt;,
  timeoutMs = 3000
<h2>${h2[2]}</h2>
<p>
  Berikut adalah implementasi proteksi nyata yang menerapkan prinsip <em>${archetype.headingBlueprint.codeFocus}</em>. ${industry.codeContextHint}:
</p>

<pre><code class="language-typescript">// Implementasi Proteksi Tingkat Lanjut untuk ${industry.name}
// Fokus: ${archetype.headingBlueprint.codeFocus}

export interface ResilienceConfig {
  maxRetries: number;
  baseTimeoutMs: number;
  idempotencyTtlSeconds: number;
}

export async function executeHardenedPipeline&lt;T&gt;(
  operationId: string,
  idempotencyKey: string,
  handler: () => Promise&lt;T&gt;,
  config: ResilienceConfig = { maxRetries: 3, baseTimeoutMs: 1200, idempotencyTtlSeconds: 86400 }
): Promise&lt;T&gt; {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // 1. Validasi Idempotensi Transaksi
  const isDuplicate = await verifyDistributedLock(idempotencyKey, config.idempotencyTtlSeconds);
  if (isDuplicate) {
    throw new Error(\`[IdempotencyViolation] Duplicate transaction rejected: \${idempotencyKey}\`);
  }

  try {
    const startTime = performance.now();
    const result = await Promise.race([
      queryFn(),
      new Promise&lt;never&gt;((_, reject) =>
        setTimeout(() => reject(new Error(\`Query timeout exceeded \${timeoutMs}ms\`)), timeoutMs)
      ),
    ]);
  let attempt = 0;
  while (attempt &lt; config.maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.baseTimeoutMs);

    const duration = performance.now() - startTime;
    if (duration > 1000) {
      console.warn(\`[Slow Query Warning] \${operationName} took \${duration.toFixed(2)}ms\`);
    try {
      const result = await Promise.race([
        handler(),
        new Promise&lt;never&gt;((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(\`[TimeoutExceeded] Operation timed out after \${config.baseTimeoutMs}ms\`));
          });
        }),
      ]);
      clearTimeout(timeout);
      return result;
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isRetryable = err instanceof Error &amp;&amp; !err.message.includes("IdempotencyViolation");
      if (!isRetryable || attempt &gt;= config.maxRetries) {
        throw err;
      }
      // Exponential backoff dengan jitter acak untuk mencegah thundering herd
      const jitterMs = Math.floor(Math.random() * 150);
      const backoffDelay = Math.pow(2, attempt) * 100 + jitterMs;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

    return result;
  } finally {
    clearTimeout(timer);
  }
  throw new Error("[PipelineFailure] Max retries exhausted");
}

async function verifyDistributedLock(key: string, ttl: number): Promise&lt;boolean&gt; {
  // Simulasi atomic check-and-set via Redis / Key-Value store
  return false;
}
</code></pre>

<h2>3. Mitigasi Risiko dan Best Practices di Lingkungan Produksi</h2>
<h2>${h2[3]}</h2>
<p>
  Dalam mengoperasikan sistem di lingkungan produksi, tim harus memantau metrik kesehatan secara proaktif melalui telemetry. Beberapa aturan praktis yang wajib dijalankan:
  Dalam mengoperasikan sistem di lingkungan produksi, implementasi kode hanyalah separuh dari persamaan. Tim rekayasa wajib menerapkan observabilitas dan kontrol operasional yang ketat:
</p>

<ul>
  <li><strong>Monitoring p95 dan p99:</strong> Rata-rata latensi sering kali menyembunyikan 1% pengguna yang mengalami timeout fatal. Selalu jadikan p99 sebagai metrik acuan SLA.</li>
  <li><strong>Graceful Degradation:</strong> Jika service eksternal atau database sedang mengalami beban ekstrem, sajikan stale data daripada melempar error 500 ke pengguna akhir.</li>
  <li><strong>Audit Dependensi:</strong> Batasi jumlah package eksternal pada runtime kritis untuk meminimalkan permukaan serangan (*attack surface*) dan memory footprint.</li>
  <li><strong>Monitoring Berbasis SLA p99:</strong> Metrik rata-rata (mean/average) sering kali menyembunyikan 1% pengguna yang mengalami timeout fatal. Pastikan sistem alarm terpicu saat latensi persentil p99 melampaui ambang batas aman.</li>
  <li><strong>Graceful Degradation:</strong> Rancang antarmuka pengguna dan API downstream agar dapat menyajikan *stale cached data* atau fallback response ketika layanan hulu mengalami lonjakan beban sesaat.</li>
  <li><strong>Automated Chaos Testing:</strong> Uji skenario kegagalan koneksi database dan partisi jaringan secara berkala di lingkungan staging untuk memverifikasi bahwa *circuit breaker* bereaksi sesuai ekspektasi.</li>
  <li><strong>Monitoring Berbasis SLA p99:</strong> Metrik rata-rata sering kali menyembunyikan 1% pengguna yang mengalami timeout fatal. Pastikan sistem alarm terpicu saat latensi persentil p99 melampaui ambang batas aman.</li>
  <li><strong>Graceful Degradation:</strong> Rancang antarmuka pengguna dan API downstream agar dapat menyajikan stale data atau fallback response ketika layanan hulu mengalami lonjakan beban sesaat.</li>
  <li><strong>Automated Chaos Testing:</strong> Uji skenario kegagalan koneksi database dan partisi jaringan secara berkala di lingkungan staging untuk memverifikasi bahwa circuit breaker bereaksi sesuai ekspektasi.</li>
</ul>

<p>
  Di Inxora Studio, implementasi seperti ini merupakan standar baku pada layanan <a href="${relevantService.path}"><strong>${relevantService.name}</strong></a> untuk memastikan platform klien memiliki ketahanan tinggi (*high availability*) dan efisiensi biaya infrastruktur cloud.
  Di Inxora Studio, implementasi standar seperti ini merupakan fondasi utama pada layanan <a href="${relevantService.path}"><strong>${relevantService.name}</strong></a> untuk memastikan platform enterprise klien memiliki skalabilitas tanpa kompromi (*fault-tolerant architecture*) serta efisiensi biaya infrastruktur cloud jangka panjang.
  Di Inxora Studio, implementasi standar seperti ini merupakan fondasi utama pada layanan <a href="${relevantService.path}"><strong>${relevantService.name}</strong></a> untuk memastikan platform enterprise klien memiliki skalabilitas tanpa kompromi serta efisiensi biaya infrastruktur cloud jangka panjang.
</p>
  `.trim();

  const safeExcerpt = excerpt.length > 250 ? excerpt.slice(0, 247) + "..." : excerpt;
  const safeMetaDesc = safeExcerpt.length > 160 ? safeExcerpt.slice(0, 157) + "..." : safeExcerpt;

  return {
    title,
    excerpt: safeExcerpt,
    content,
    tags: Array.from(new Set([...recommendedKeywords, "Engineering", "Architecture"])).slice(0, 5),
    tags: Array.from(new Set([...recommendedKeywords, industry.name.split(" ")[0], "Architecture"])).slice(0, 5),
    metaTitle: title.length > 55 ? title.slice(0, 67) : `${title} · Inxora`,
    metaDesc: safeMetaDesc,
    category,
  };
}

/**
 * Main writer interface.
 * Dual-Mode Content Generator:
 * Uses Gemini API if GEMINI_API_KEY is configured, otherwise uses structured technical engine.
 * Universal Dual-Mode Content Generator:
 * Executes 3-Stage AI Orchestra Pipeline if AI_API_KEY is configured.
 * Automatically falls back to Diverse Procedural Engine if key is missing or endpoint is offline.
 */
export async function generateArticle(plan: ResearchPlan): Promise<GeneratedArticle> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const config = getAIConfig();

  if (apiKey) {
  if (config.apiKey) {
    try {
      console.log(`[Writer] Querying Gemini AI for topic: "${plan.topic}"...`);
      console.log(`[Writer] Querying Gemini AI with Archetype: "${plan.archetype.name}" & Industry: "${plan.industry.name}"...`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: buildSystemPrompt(plan.category) }],
            },
            contents: [
              {
                parts: [
                  {
                    text: `Tulis artikel blog teknis mendalam tentang "${plan.topic}".
Target Kategori: ${plan.category}
Search Intent: ${plan.searchIntent}
Sudut Pandang Pembeda (Information Gain): ${plan.informationGainAngle}
Arketipe Narasi yang Wajib Diadopsi: ${plan.archetype.name} (${plan.archetype.tagline})
Petunjuk Gaya Arketipe: ${plan.archetype.promptInstruction}
Konteks Industri Nyata: ${plan.industry.name} - ${plan.industry.workloadDescription}
Fokus Kode: ${plan.archetype.headingBlueprint.codeFocus} (${plan.industry.codeContextHint})

Blueprint Sub-Heading (H2) yang harus digunakan:
${plan.archetype.headingBlueprint.h2Sections.map((s) => `- ${s}`).join("\n")}

${plan.antiCannibalizationPrompt}

Kembalikan HANYA JSON valid dengan struktur:
{
  "title": "Judul spesifik dan memikat tanpa kata klise",
  "excerpt": "Ringkasan 1-2 kalimat (max 200 karakter) yang menjawab inti masalah",
  "title": "Judul spesifik, memikat, sesuai arketipe tanpa kata klise",
  "excerpt": "Ringkasan 1-2 kalimat (max 180 karakter) yang menjawab inti masalah",
  "content": "HTML semantik lengkap (h2, h3, p, pre/code, table, blockquote) tanpa wrapper \`\`\`html",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
              temperature: 0.75,
            },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const rawJsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          console.log(`✓ Gemini AI article generated successfully.`);
          console.log(`✓ Gemini AI article generated successfully with archetype: ${plan.archetype.name}`);
          return {
            title: parsed.title,
            excerpt: parsed.excerpt,
            excerpt: parsed.excerpt?.length > 250 ? parsed.excerpt.slice(0, 247) + "..." : parsed.excerpt,
            content: parsed.content,
            tags: parsed.tags || plan.recommendedKeywords,
            metaTitle:
              parsed.title?.length > 55
                ? parsed.title.slice(0, 67)
                : `${parsed.title} · Inxora`,
            metaDesc:
              parsed.excerpt?.length > 160
                ? parsed.excerpt.slice(0, 157) + "..."
                : parsed.excerpt,
            category: plan.category,
          };
        }
      }
      console.warn(`[Writer] Gemini returned non-OK or empty. Falling back to technical procedural engine.`);
      console.warn(`[Writer] Gemini returned non-OK or empty. Falling back to diverse procedural technical engine.`);
      console.log(`[Writer] Initializing AI Multi-Agent Orchestra with endpoint: ${config.endpoint}...`);
      const polished: PolishedArticle = await runOrchestraPipeline(plan);
      return polished;
    } catch (err: unknown) {
      console.warn(`[Writer] Gemini inference failed, using technical fallback:`, err);
      console.warn(`[Writer] Gemini inference failed, using diverse technical fallback:`, err);
      console.warn(`[Writer] AI Orchestra pipeline encountered an issue. Falling back to diverse procedural engine:`, err);
    }
  } else {
    console.log(`[Writer] No AI_API_KEY detected in .env. Running diverse procedural technical engine.`);
  }

  // Procedural high-grade fallback
  // Diverse procedural technical fallback
  return generateTechnicalDraft(plan);
}

