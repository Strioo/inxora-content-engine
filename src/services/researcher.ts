import { INXORA_CATEGORIES } from "../config.js";
import {
  ArchetypeDefinition,
  IndustryContext,
  ARCHETYPES,
  INDUSTRIES,
  getRandomArchetype,
  getRandomIndustry,
  ArchetypeId,
  IndustryId,
} from "./archetypes.js";
import {
  ArticleHistoryItem,
  fetchRecentArticles,
  buildAntiCannibalizationPrompt,
} from "./history-guard.js";
import {
  createChatCompletion,
  extractJSON,
  getAIConfig,
} from "./ai-client.js";
import {
  gatherLiveSerpIntelligence,
  SerpIntelligenceResult,
} from "./serp-fetcher.js";
import {
  fetchInxoraKnowledgeContext,
  InxoraKnowledgeContext,
} from "./context-fetcher.js";

export interface DeepResearchDossier {
  verifiedTechStack: string[];
  keyIndustryPainPoints: string[];
  benchmarks: {
    metric: string;
    measuredValue: string;
    context: string;
  }[];
  authoritativeSources: {
    title: string;
    url: string;
    note: string;
  }[];
  visualKeywords: string[];
  rawContextSummary: string;
}

export interface ResearchPlan {
  topic: string;
  category: string;
  targetAudience: string;
  searchIntent: "Informational" | "Commercial Investigation" | "Practical Guide";
  coreProblem: string;
  informationGainAngle: string;
  recommendedKeywords: string[];
  archetype: ArchetypeDefinition;
  industry: IndustryContext;
  existingArticles: ArticleHistoryItem[];
  antiCannibalizationPrompt: string;
  dossier: DeepResearchDossier;
  knowledgeContext: InxoraKnowledgeContext;
  serpSignals: SerpIntelligenceResult;
}

export interface ResearchOptions {
  category?: string;
  archetype?: string;
  industry?: string;
  context?: InxoraKnowledgeContext;
}

const STOPWORDS = new Set([
  "dan", "di", "ke", "dari", "pada", "untuk", "dengan", "arsitektur", "strategi",
  "panduan", "implementasi", "pola", "sistem", "studi", "kasus", "analisis", "rekayasa",
  "with", "in", "and", "or", "for", "on", "the", "a", "an", "at", "of", "to",
  "how", "what", "using", "into", "over", "under", "via", "by", "from", "high",
  "skala", "besar", "modern", "tahan", "banting", "best", "practices", "cara", "memilih"
]);

function extractSearchKeywords(topic: string, category: string): string[] {
  const commonTerms = [
    "nextjs", "react", "flutter", "pwa", "ui", "ux", "redesign", "seo",
    "cloud", "saas", "ai", "automation", "llm", "chatbot", "api", "mobile",
    "conversion", "performance", "vitals", "architecture", "ecommerce"
  ];

  const lowerTopic = topic.toLowerCase();
  const matchedTerms = commonTerms.filter((t) => lowerTopic.includes(t));

  if (matchedTerms.length >= 2) {
    return matchedTerms.slice(0, 2);
  }

  const words = topic
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  if (matchedTerms.length === 1) {
    const otherWords = words.filter((w) => !matchedTerms.includes(w));
    return [matchedTerms[0], ...(otherWords.slice(0, 1))];
  }

  if (words.length >= 2) {
    return words.slice(0, 2);
  } else if (words.length === 1) {
    return [words[0]];
  }

  const catKeywords = INXORA_CATEGORIES[category]?.keywords || ["web-development", "digital-product"];
  return catKeywords.slice(0, 2);
}

async function fetchLiveIntelligence(
  topic: string,
  category: string
): Promise<{
  hnStories: Array<{ title: string; url: string; points: number }>;
  githubRepos: Array<{ name: string; url: string; stars: number; description: string }>;
}> {
  const keywords = extractSearchKeywords(topic, category);
  const primaryQuery = encodeURIComponent(keywords.join(" "));
  console.log(`    ↳ Querying live signals for: [${keywords.join(" ")}]...`);

  const [hnRes, ghRes] = await Promise.allSettled([
    fetch(
      `https://hn.algolia.com/api/v1/search?query=${primaryQuery}&tags=story&hitsPerPage=5`,
      { signal: AbortSignal.timeout(5000) }
    ).then((r) => r.json()),
    fetch(
      `https://api.github.com/search/repositories?q=${primaryQuery}&sort=stars&order=desc&per_page=5`,
      {
        headers: { "User-Agent": "Inxora-SEO-Research-Agent/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    ).then((r) => r.json()),
  ]);

  const hnStories: Array<{ title: string; url: string; points: number }> = [];
  if (hnRes.status === "fulfilled" && Array.isArray(hnRes.value?.hits)) {
    for (const h of hnRes.value.hits) {
      if (h.title) {
        hnStories.push({
          title: h.title,
          url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          points: h.points || 0,
        });
      }
    }
  }

  const githubRepos: Array<{ name: string; url: string; stars: number; description: string }> = [];
  if (ghRes.status === "fulfilled" && Array.isArray(ghRes.value?.items)) {
    for (const r of ghRes.value.items) {
      if (r.full_name) {
        githubRepos.push({
          name: r.full_name,
          url: r.html_url || `https://github.com/${r.full_name}`,
          stars: r.stargazers_count || 0,
          description: r.description || "",
        });
      }
    }
  }

  return { hnStories, githubRepos };
}

async function synthesizeDeepDossier(
  topic: string,
  category: string,
  industry: IndustryContext,
  serpSignals: SerpIntelligenceResult
): Promise<DeepResearchDossier> {
  const config = getAIConfig();
  console.log(`  [Orchestra 0/3: Search Intent & Product Researcher] Gathering intelligence...`);

  let liveSignals = { hnStories: [], githubRepos: [] } as Awaited<ReturnType<typeof fetchLiveIntelligence>>;
  try {
    liveSignals = await fetchLiveIntelligence(topic, category);
    console.log(
      `    ↳ Ingested: ${liveSignals.hnStories.length} discussions, ${liveSignals.githubRepos.length} repositories.`
    );
  } catch {
    console.warn("    ↳ Live feed timeout/error, continuing with foundational digital product intelligence.");
  }

  const systemPrompt = `You are a Principal Digital Product & Technology Consultant for Inxora Studio.
Your goal is to analyze search intent and produce an actionable "Deep Research Dossier" for an upcoming organic SEO article on "${topic}".
Target Category: ${category}
Industry Context: ${industry.name} (${industry.workloadDescription})

Strict Editorial Guidelines:
1. Target Audience: Business Founders, CEOs, CTOs, Product Managers, and SME business owners seeking solutions.
2. Identify real business pain points and bottlenecks (e.g. bounce rates, slow page speed, high drop-off on checkout, expensive cloud bills, legacy tech maintenance costs).
3. Provide realistic, measurable benchmarks (e.g. Core Web Vitals LCP < 2.2s, 30% increase in mobile conversions, 4-6 weeks time-to-market for MVP).
4. Extract 2-3 authoritative references (e.g. Google Search Central, Next.js official documentation, Nielsen Norman Group UX research, Inxora service blueprints).
5. Provide 3-5 visual keywords for photography matching professional modern digital products (e.g. "modern tech office startup team laptop", "mobile app ui design wireframe", "software analytics dashboard minimal").
6. NO low-level SRE/kernel jargon (no distributed lock starving, thread mutex, or kernel buffer discussions). Focus on business-technical value.

Return ONLY valid JSON matching this schema:
{
  "verifiedTechStack": ["e.g. Next.js 15", "TypeScript", "Tailwind CSS", "Vercel / Cloudflare"],
  "keyIndustryPainPoints": [
    "Deskripsi tantangan nyata bisnis di industri ini (misal: tingkat konversi mobile rendah, beban biaya pemeliharaan website)"
  ],
  "benchmarks": [
    {
      "metric": "Largest Contentful Paint (LCP)",
      "measuredValue": "< 2.0s",
      "context": "Optimasi Core Web Vitals untuk meningkatkan peringkat SEO dan menurunkan bounce rate"
    }
  ],
  "authoritativeSources": [
    {
      "title": "Dokumentasi Resmi / Riset UX / Panduan Google",
      "url": "https://example.com/docs",
      "note": "Konteks manfaat untuk bisnis"
    }
  ],
  "visualKeywords": ["modern web development workspace", "ui ux design laptop screen", "technology team meeting"],
  "rawContextSummary": "Ringkasan 2 paragraf mengenai tren industri, tantangan utama audiens, dan solusi strategis yang tepat."
}`;

  const userPrompt = `Synthesize deep search-intent and product research dossier for topic: "${topic}"
Live Google Search Queries in Indonesia:
${serpSignals.googleQueries.map((q) => `- "${q}"`).join("\n") || "- (No direct autocomplete query)"}

Live Indexed Google Articles:
${serpSignals.trendingArticles.map((a) => `- "${a.title}" (${a.source}) -> ${a.url}`).join("\n") || "- (No live articles indexed)"}

Live Community Discussions:
${liveSignals.hnStories.map((s) => `- ${s.title} (${s.points} pts) -> ${s.url}`).join("\n") || "No live discussions found."}
${serpSignals.hnDiscussions.map((s) => `- ${s.title} (${s.points} pts) -> ${s.url}`).join("\n") || "No live discussions found."}

Trending Repositories:
${liveSignals.githubRepos.map((r) => `- ${r.name} (${r.stars} stars): ${r.description} -> ${r.url}`).join("\n") || "No live repos found."}
${serpSignals.githubRepos.map((r) => `- ${r.name} (${r.stars} stars): ${r.description} -> ${r.url}`).join("\n") || "No live repos found."}

Industry Context:
- Industry: ${industry.name}
- Workload Context: ${industry.workloadDescription}
- Core Challenges: ${industry.commonChallenges.join(", ")}
- Business Goals: ${industry.keyBusinessGoals}`;

  try {
    const responseText = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: config.researcherModel,
        fallbackModel: config.defaultModel,
        temperature: 0.35,
        timeoutMs: 40000,
      }
    );

    return extractJSON<DeepResearchDossier>(responseText);
  } catch (err: unknown) {
    console.warn("  ⚠️ AI Dossier synthesis timed out or failed. Using fallback baseline dossier.");
    return {
      verifiedTechStack: ["Next.js 15", "TypeScript", "Tailwind CSS", "React Server Components"],
      keyIndustryPainPoints: [
        `Tingginya bounce rate pengunjung akibat loading website yang lambat di industri ${industry.name}.`,
        "Biaya pemeliharaan platform digital yang membengkak tanpa kenaikan konversi yang sebanding.",
        "Kesulitan memilih arsitektur teknologi yang tepat antara template instan vs solusi kustom modern.",
      ],
      benchmarks: [
        {
          metric: "Target Core Web Vitals (LCP)",
          measuredValue: "< 2.2 detik",
          context: "Standar Google untuk pengalaman pengguna optimal dan visibilitas SEO maksimal",
        },
        {
          metric: "Peningkatan Konversi (CRO)",
          measuredValue: "15% - 35%",
          context: "Dampak langsung dari navigasi yang responsif dan desain UI/UX berbasis data",
        },
      ],
      authoritativeSources: [
        {
          title: "Inxora Digital Product Engineering Standard",
          url: "https://inxorastudio.com/services/web-development",
          note: "Standar pengembangan website dan aplikasi modern berkinerja tinggi",
        },
      ],
      visualKeywords: ["modern software dashboard", "responsive web design", "creative tech studio workspace"],
      rawContextSummary: `Analisis strategis mengenai ${topic} yang disesuaikan dengan kebutuhan akselerasi bisnis pada sektor ${industry.name}.`,
    };
  }
}

export async function researchTopic(
  topic: string,
  options: ResearchOptions = {}
): Promise<ResearchPlan> {
  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();

  // 1. Resolve Category
  let category = options.category;
  if (!category || !INXORA_CATEGORIES[category]) {
    if (
      lower.includes("ai") ||
      lower.includes("llm") ||
      lower.includes("agent") ||
      lower.includes("automation") ||
      lower.includes("chatbot") ||
      lower.includes("machine learning")
    ) {
      category = "Artificial Intelligence";
    } else if (
      lower.includes("design") ||
      lower.includes("ui") ||
      lower.includes("ux") ||
      lower.includes("redesign") ||
      lower.includes("tampilan") ||
      lower.includes("cro") ||
      lower.includes("interface")
    ) {
      category = "UI/UX & Product Design";
    } else if (
      lower.includes("cloud") ||
      lower.includes("arsitektur") ||
      lower.includes("server") ||
      lower.includes("hosting") ||
      lower.includes("saas") ||
      lower.includes("infrastructure")
    ) {
      category = "System Architecture & Cloud";
    } else {
      category = "Web & App Development";
    }
  }

  const categoryConfig = INXORA_CATEGORIES[category];

  // 2. Resolve Archetype
  let archetype: ArchetypeDefinition;
  if (options.archetype && ARCHETYPES[options.archetype as ArchetypeId]) {
    archetype = ARCHETYPES[options.archetype as ArchetypeId];
  } else {
    archetype = getRandomArchetype();
  }

  // 3. Resolve Industry Context
  let industry: IndustryContext;
  if (options.industry && INDUSTRIES[options.industry as IndustryId]) {
    industry = INDUSTRIES[options.industry as IndustryId];
  } else {
    industry = getRandomIndustry();
  }

  // 4. Fetch History & Build Anti-Cannibalization Guard
  // 4. Fetch Knowledge Context from Live Next.js Web App
  const knowledgeContext = options.context || (await fetchInxoraKnowledgeContext());

  // 5. Gather Live Google SERP & Web Intelligence
  const searchTerms = extractSearchKeywords(cleanTopic, category);
  const serpQuery = searchTerms.length > 0 ? searchTerms.join(" ") : cleanTopic;
  const serpSignals = await gatherLiveSerpIntelligence(serpQuery);

  // 6. Fetch History & Build Anti-Cannibalization Guard
  const existingArticles = await fetchRecentArticles();
  const antiCannibalizationPrompt = buildAntiCannibalizationPrompt(existingArticles);

  // 7. Stage 0: Search Intent & Product Research Synthesis
  const dossier = await synthesizeDeepDossier(cleanTopic, category, industry, serpSignals);

  // 8. Determine Search Intent
  let searchIntent: "Informational" | "Commercial Investigation" | "Practical Guide" = "Informational";
  if (lower.includes("panduan") || lower.includes("cara") || lower.includes("langkah") || lower.includes("tutorial")) {
    searchIntent = "Practical Guide";
  } else if (lower.includes("vs") || lower.includes("biaya") || lower.includes("memilih") || lower.includes("jasa") || lower.includes("rekomendasi")) {
    searchIntent = "Commercial Investigation";
  }

  return {
    topic: cleanTopic,
    category,
    targetAudience: `Business Founders, Product Leaders & Decision Makers in ${industry.name}`,
    searchIntent,
    coreProblem: `Tantangan pengambilan keputusan, efisiensi biaya, dan hasil bisnis pada ${cleanTopic} dalam industri ${industry.name}.`,
    informationGainAngle: `${archetype.narrativeAngle} dengan relevansi langsung bagi ${industry.name}.`,
    recommendedKeywords: [
      ...categoryConfig.keywords.slice(0, 3),
      industry.name.toLowerCase().split(" ")[0],
      cleanTopic.toLowerCase().replace(/[^\w\s]/g, "").slice(0, 30),
    ],
    archetype,
    industry,
    existingArticles,
    antiCannibalizationPrompt,
    dossier,
    knowledgeContext,
    serpSignals,
  };
}
