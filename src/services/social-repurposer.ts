import fs from "fs";
import path from "path";
import { z } from "zod";
import { createChatCompletion, extractJSON, getAIConfig } from "./ai-client.js";
import type { PolishedArticle } from "./orchestra.js";

export interface SocialRepurposingPackage {
  linkedIn: string;
  twitterThread: string[];
  newsletterBlurb: string;
  hashtags: string[];
}

const SNIPPETS_DIR = path.resolve(process.cwd(), "data/social-snippets");

/**
 * Repurposes a published organic article into multi-platform social media distribution assets.
 */
export async function repurposeForSocial(
  article: PolishedArticle,
  publicUrl: string
): Promise<SocialRepurposingPackage> {
  console.log(`\n📲 [Social Repurposer] Generating omnichannel distribution assets for "${article.title}"...`);
  const config = getAIConfig();

  const systemPrompt = `You are a Senior B2B Tech Copywriter & Organic Distribution Strategist for Inxora Studio (https://inxorastudio.com).
Your goal is to turn this technical & business article into high-converting, insightful social media posts that build authority and drive traffic to the full article.

Requirements:
1. LinkedIn Post (Professional, High CTR):
   - Hook the reader in the first 2 lines (call out an expensive mistake, latency issue, or architectural myth).
   - 3 bullet points highlighting concrete takeaways or comparison findings.
   - Clean call-to-action directing readers to the live article at: ${publicUrl}
   - No robotic buzzwords or generic motivational filler.

2. Twitter/X Thread (3-4 Tweets):
   - Tweet 1: Provocative hook + thesis statement.
   - Tweet 2: Key data/architecture comparison or checklist insight.
   - Tweet 3: Practical recommendation for founders/engineers.
   - Tweet 4: Link to read the complete breakdown: ${publicUrl}

3. Newsletter / Broadcast Blurb:
   - 1 tight executive paragraph (under 80 words) summarizing the core finding and recommending the article.

Return ONLY valid JSON matching this schema:
{
  "linkedIn": "Teks lengkap LinkedIn post...",
  "twitterThread": [
    "Tweet 1...",
    "Tweet 2...",
    "Tweet 3...",
    "Tweet 4..."
  ],
  "newsletterBlurb": "Ringkasan eksekutif newsletter...",
  "hashtags": ["#WebDev", "#SoftwareEngineering", "#TechStrategy", "#B2BTech"]
}`;

  const userPrompt = `Repurpose this article:
Title: "${article.title}"
Category: ${article.category}
Excerpt: "${article.excerpt}"
Target Live URL: ${publicUrl}
FAQ Count: ${article.faqItems?.length || 0}

Article Excerpt & Key Content:
${article.content.slice(0, 1500)}...`;

  let result: SocialRepurposingPackage;

  try {
    const responseText = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: config.writerModel || config.defaultModel,
        fallbackModel: config.reviewerFallbackModel || config.defaultModel,
        temperature: 0.5,
        timeoutMs: 60000,
      }
    );

    result = extractJSON<SocialRepurposingPackage>(responseText);
  } catch (err) {
    console.warn("⚠️ AI Social Repurposer call failed, using procedural fallback:", err);

    result = {
      linkedIn: `Banyak founder dan pimpinan teknologi menghadapi dilema saat mengevaluasi ${article.title}.\n\nBerikut 3 pertimbangan kritis yang wajib ditinjau:\n1. Efisiensi biaya dan alokasi infrastruktur cloud jangka panjang.\n2. Kecepatan iterasi fitur dan kesiapan tim rekayasa.\n3. Skalabilitas arsitektur saat volume pengguna meningkat drastis.\n\nSimak analisis mendalam dan panduan praktis lengkapnya di:\n👉 ${publicUrl}\n\n#InxoraStudio #TechStrategy #SoftwareEngineering #B2BTech`,
      twitterThread: [
        `Mengevaluasi ${article.title}? Banyak tim terjebak pada komparasi fitur dangkal tanpa memperhitungkan biaya jangka panjang. Berikut rangkumannya 🧵👇`,
        `Kunci utamanya adalah mengukur time-to-market versus fleksibilitas kode. Jangan overengineer sebelum produk Anda mencapai product-market fit.`,
        `Pilihan terbaik selalu bergantung pada skala tim dan kompleksitas domain bisnis Anda. Baca telaah lengkap kami di sini: ${publicUrl}`,
      ],
      newsletterBlurb: `Dalam artikel terbaru kami, kami mengulas tuntas "${article.title}". Kami menganalisis bagaimana keputusan arsitektur awal berdampak langsung pada efisiensi anggaran dan pertumbuhan produk digital Anda. Baca selengkapnya di: ${publicUrl}`,
      hashtags: ["#InxoraStudio", "#TechStrategy", "#WebDevelopment", "#SoftwareArchitecture"],
    };
  }

  // Persist to disk in data/social-snippets/[slug].json
  try {
    if (!fs.existsSync(SNIPPETS_DIR)) {
      fs.mkdirSync(SNIPPETS_DIR, { recursive: true });
    }
    const slug = path.basename(publicUrl);
    const filePath = path.join(SNIPPETS_DIR, `${slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`   ✓ Social distribution package saved to: ${filePath}`);
  } catch (err) {
    console.warn("⚠️ Failed to write social snippet to disk:", err);
  }

  return result;
}

const SocialRepurposingPackageSchema = z.object({
  linkedIn: z.string(),
  twitterThread: z.array(z.string()),
  newsletterBlurb: z.string(),
  hashtags: z.array(z.string()),
});

export interface NewsletterSnippetInfo {
  subject: string;
  previewText: string;
  blurb: string;
}

/**
 * Loads previously persisted social media repurposing snippets for a given article slug.
 */
export function getRepurposedSnippets(slug: string): SocialRepurposingPackage | null {
  try {
    const cleanSlug = path.basename(slug.trim());
    const filePath = path.join(SNIPPETS_DIR, `${cleanSlug}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed: unknown = JSON.parse(content);
      const res = SocialRepurposingPackageSchema.safeParse(parsed);
      if (res.success) {
        return res.data;
      }
    }
  } catch (err: unknown) {
    console.warn(`⚠️ Failed to load repurposed snippets for slug "${slug}":`, err);
  }
  return null;
}

/**
 * Returns structured newsletter snippet details from persisted snippets or fallback.
 */
export function getNewsletterSnippet(slug: string, articleTitle?: string): NewsletterSnippetInfo | null {
  const snippets = getRepurposedSnippets(slug);
  if (!snippets) return null;
  return {
    subject: articleTitle ? `[Inxora Studio] ${articleTitle}` : "Inxora Tech & Engineering Digest",
    previewText: snippets.newsletterBlurb.slice(0, 140),
    blurb: snippets.newsletterBlurb,
  };
}

/**
 * Formats a clean newsletter subject line.
 */
export function formatNewsletterSubject(title: string, category?: string): string {
  const prefix = category ? `[Inxora ${category}]` : "[Inxora Digest]";
  return `${prefix} ${title}`.trim();
}

