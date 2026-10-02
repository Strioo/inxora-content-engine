import fs from "fs";
import path from "path";
import { fetchInxoraKnowledgeContext } from "./context-fetcher.js";
import {
  fetchGoogleSearchSuggestions,
  fetchGoogleLiveArticles,
  fetchCommunitySignals,
  LiveArticleSignal,
} from "./serp-fetcher.js";
import { ArchetypeId, IndustryId } from "./archetypes.js";
import { createChatCompletion, extractJSON, getAIConfig } from "./ai-client.js";
import { TopicResearchMode } from "../config.js";

export interface BacklogTopicItem {
  id: string;
  topic: string;
  category: string;
  archetype: ArchetypeId;
  industry: IndustryId;
  targetKeyword: string;
  searchIntent: "Informational" | "Commercial Investigation" | "Practical Guide";
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "QUEUED" | "IN_PROGRESS" | "PUBLISHED" | "FAILED" | "RETRYING";
  researchMode?: TopicResearchMode;
  attempts?: number;
  retryCount?: number;
  maxRetries?: number;
  lastError?: string;
  nextRetryTimestamp?: number;
  publishedUrl?: string;
  createdAt: string;
  publishedAt?: string;
}

const BACKLOG_FILE_PATH = path.resolve(process.cwd(), "data/content-backlog.json");

export const EVERGREEN_KEYWORD_CLUSTERS = [
  // Cluster 1: Web Development & Online Presence Dasar
  {
    category: "Web Development",
    archetype: "strategic-comparison" as ArchetypeId,
    industry: "corporate-services" as IndustryId,
    seeds: [
      "mengapa bisnis butuh website",
      "website vs instagram untuk jualan",
      "roadmap web developer 2026 pemula",
      "biaya pembuatan website bisnis",
      "panduan membuat website company profile",
    ],
  },
  // Cluster 2: Hosting, Domain & Cloud Dasar
  {
    category: "System Architecture",
    archetype: "cost-and-roi-blueprint" as ArchetypeId,
    industry: "corporate-services" as IndustryId,
    seeds: [
      "panduan memilih hosting untuk pemilik usaha",
      "perbedaan domain hosting dan cloud storage",
      "apa itu ssl dan kenapa website butuh https",
      "cara memilih nama domain bisnis",
      "biaya cloud hosting vs vps pemula",
    ],
  },
  // Cluster 3: UI/UX & Desain Konversi Pemula
  {
    category: "UI/UX Design",
    archetype: "problem-solver-checklist" as ArchetypeId,
    industry: "sme-retail" as IndustryId,
    seeds: [
      "mengapa desain website mempengaruhi penjualan",
      "perbedaan ui dan ux bahasa sederhana",
      "cara meningkatkan conversion rate website",
      "checklist audit ui ux aplikasi bisnis",
      "redesign website toko online tingkatkan omset",
    ],
  },
  // Cluster 4: Aplikasi Mobile & Solusi Digital Bisnis
  {
    category: "App Development",
    archetype: "practical-guide" as ArchetypeId,
    industry: "b2b-saas" as IndustryId,
    seeds: [
      "kapan bisnis butuh aplikasi mobile",
      "perbedaan website vs aplikasi android ios",
      "biaya pembuatan aplikasi mobile flutter",
      "tahapan pembuatan mvp aplikasi startup",
    ],
  },
  // Cluster 5: Tech Strategy & Transformasi Digital Bisnis
  {
    category: "Technology",
    archetype: "business-innovation-insight" as ArchetypeId,
    industry: "education-edutech" as IndustryId,
    seeds: [
      "digitalisasi sistem operasional bisnis",
      "integrasi payment gateway indonesia",
      "custom erp vs software saas langganan",
      "langkah awal transformasi digital ukm",
    ],
  },
];

export const SEED_KEYWORD_CLUSTERS = EVERGREEN_KEYWORD_CLUSTERS;

export const TREND_NEWS_CLUSTERS = [
  {
    category: "Web Development",
    archetype: "strategic-comparison" as ArchetypeId,
    industry: "corporate-services" as IndustryId,
    query: "Next.js React",
    seeds: ["next js 15", "react 19 server components", "next js app router performance"],
  },
  {
    category: "Web Development",
    archetype: "practical-guide" as ArchetypeId,
    industry: "b2b-saas" as IndustryId,
    query: "TypeScript Node.js",
    seeds: ["typescript modern update", "node js modern features", "full stack web development trends 2026"],
  },
  {
    category: "Artificial Intelligence",
    archetype: "business-innovation-insight" as ArchetypeId,
    industry: "b2b-saas" as IndustryId,
    query: "AI models LLM agentic",
    seeds: ["agentic ai workflow", "llm application engineering", "pemanfaatan ai untuk otomasi bisnis"],
  },
  {
    category: "App Development",
    archetype: "strategic-comparison" as ArchetypeId,
    industry: "b2b-saas" as IndustryId,
    query: "Flutter React Native",
    seeds: ["flutter updates mobile", "react native vs flutter 2026", "mobile multiplatform architecture"],
  },
  {
    category: "System Architecture",
    archetype: "cost-and-roi-blueprint" as ArchetypeId,
    industry: "corporate-services" as IndustryId,
    query: "Cloud serverless architecture",
    seeds: ["arsitektur cloud hemat biaya", "serverless vs container 2026", "optimasi database high traffic"],
  },
];

/**
 * Loads current content backlog from disk.
 */
export function loadBacklog(): BacklogTopicItem[] {
  try {
    if (!fs.existsSync(BACKLOG_FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(BACKLOG_FILE_PATH, "utf-8");
    return JSON.parse(raw) as BacklogTopicItem[];
  } catch (err) {
    console.warn("⚠️ Failed to load content backlog, returning empty queue:", err);
    return [];
  }
}

/**
 * Saves content backlog to disk with pretty JSON indentation.
 * Saves content backlog to disk atomically to prevent file corruption during concurrent operations.
 */
export function saveBacklog(items: BacklogTopicItem[]): void {
  const dir = path.dirname(BACKLOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BACKLOG_FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
  const tmpPath = `${BACKLOG_FILE_PATH}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(items, null, 2), "utf-8");
  fs.renameSync(tmpPath, BACKLOG_FILE_PATH);
}

/**
 * Retrieves the next queued topic from the backlog ordered by priority (HIGH > MEDIUM > LOW).
 * Optionally filters by requested researchMode (TREND_NEWS vs GENERAL_EVERGREEN).
 */
export async function getNextBacklogTopic(
  mode?: TopicResearchMode
): Promise<BacklogTopicItem | null> {
  const backlog = loadBacklog();
  const now = Date.now();
  let queued = backlog.filter(
    (b) =>
      b.status === "QUEUED" ||
      (b.status === "RETRYING" && now >= (b.nextRetryTimestamp || 0))
  );
  if (queued.length === 0) return null;

  if (mode) {
    const matching = queued.filter((b) => {
      if (b.researchMode) {
        return b.researchMode === mode;
      }
      // If researchMode is not explicitly set (legacy items), default to GENERAL_EVERGREEN
      return mode === "GENERAL_EVERGREEN";
    });

    if (matching.length > 0) {
      queued = matching;
    } else {
      return null;
    }
  }

  const priorityWeights: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  queued.sort((a, b) => (priorityWeights[b.priority] || 1) - (priorityWeights[a.priority] || 1));

  return queued[0] || null;
}

/**
 * Updates the status of a specific backlog topic with retry handling.
 */
export function markBacklogTopicStatus(
  id: string,
  status: BacklogTopicItem["status"],
  details?: { publishedUrl?: string; error?: string } | string
): void {
  const backlog = loadBacklog();
  const index = backlog.findIndex((b) => b.id === id || b.topic === id);
  if (index !== -1) {
    if (status === "PUBLISHED") {
      backlog[index].status = "PUBLISHED";
      backlog[index].publishedAt = new Date().toISOString();
      if (typeof details === "string") {
        backlog[index].publishedUrl = details;
      } else if (details?.publishedUrl) {
        backlog[index].publishedUrl = details.publishedUrl;
      }
    } else if (status === "FAILED") {
      const errorText = typeof details === "string" ? details : details?.error;
      const nextRetry = (backlog[index].retryCount || 0) + 1;
      const maxRetries = backlog[index].maxRetries || 3;
      if (nextRetry < maxRetries) {
        backlog[index].status = "RETRYING";
        backlog[index].retryCount = nextRetry;
        backlog[index].lastError = errorText || "Unknown error";
        backlog[index].nextRetryTimestamp =
          Date.now() +
          Math.pow(2, Math.max(0, backlog[index].retryCount! - 1)) * 15 * 60 * 1000; // 15m, 30m, 60m backoff
        console.warn(
          `⚠️ [Topic Queue] Topic "${backlog[index].topic}" failed. Scheduled for retry (${backlog[index].retryCount}/${maxRetries}) with exponential backoff.`
        );
      } else {
        backlog[index].status = "FAILED";
        backlog[index].retryCount = nextRetry;
        backlog[index].lastError = errorText || "Max retries exceeded";
        console.warn(
          `⚠️ [Topic Queue] Topic "${backlog[index].topic}" reached max retries (${maxRetries}) and is marked as FAILED (DLQ).`
        );
      }
    } else if (status === "QUEUED") {
      backlog[index].status = "QUEUED";
      backlog[index].attempts = (backlog[index].attempts || 0) + 1;
      const errorMsg = typeof details === "string" ? details : details?.error;
      if (errorMsg) {
        backlog[index].lastError = errorMsg;
      }
      if (backlog[index].attempts! >= 3) {
        backlog[index].status = "FAILED";
        console.warn(`⚠️ [Topic Queue] Topic "${backlog[index].topic}" reached max retries (3) and is marked as FAILED.`);
      }
    } else {
      backlog[index].status = status;
    }
    saveBacklog(backlog);
  }
}

/**
 * Runs automated topic discovery:
 * 1. Pulls live Inxora post catalog to avoid keyword cannibalization.
 * 2. Fetches real signals based on mode:
 *    - TREND_NEWS: Google News RSS, Hacker News, GitHub repositories, and search suggestions.
 *    - GENERAL_EVERGREEN: Foundational Google search suggestions for beginner & B2B decision makers.
 * 3. Uses AI Topic Strategist to formulate high-intent, authoritative B2B topics.
 * 4. Saves newly discovered topics to data/content-backlog.json with researchMode tag.
 */
export async function discoverTopics(
  targetCount: number = 15,
  mode: TopicResearchMode = "GENERAL_EVERGREEN"
): Promise<BacklogTopicItem[]> {
  console.log(`\n=========================================================`);
  console.log(`🔍 Starting Autonomous Topic Discovery: Mode [${mode}]`);
  console.log(`=========================================================`);

  // 1. Fetch live knowledge graph
  console.log(`[Discovery 1/3] Fetching live Inxora catalog for anti-cannibalization...`);
  const knowledgeContext = await fetchInxoraKnowledgeContext();
  const publishedTitles = knowledgeContext.existingPosts.map((p) => p.title.toLowerCase());
  const existingBacklog = loadBacklog();
  const backlogTitles = existingBacklog.map((b) => b.topic.toLowerCase());

  console.log(`✓ Monitored Live Posts   : ${publishedTitles.length} articles`);
  console.log(`✓ Existing Backlog Items : ${existingBacklog.length} items (${existingBacklog.filter((b) => b.status === "QUEUED").length} queued)`);

  let strategistPrompt = "";
  const config = getAIConfig();

  if (mode === "TREND_NEWS") {
    // 2. Fetch live SERP, Google News RSS, and community signals (HN / GitHub)
    console.log(`\n[Discovery 2/3] Mode [TREND_NEWS]: Harvesting Google News RSS, Hacker News, GitHub & Autocomplete...`);
    const trendSignals: Array<{
      category: string;
      archetype: ArchetypeId;
      industry: IndustryId;
      query: string;
      articles: LiveArticleSignal[];
      hnStories: Array<{ title: string; url: string; points: number }>;
      githubRepos: Array<{ name: string; url: string; stars: number; description: string }>;
      suggestions: string[];
    }> = [];

    for (const cluster of TREND_NEWS_CLUSTERS) {
      const [articles, community, suggestions] = await Promise.all([
        fetchGoogleLiveArticles(cluster.query, "all"),
        fetchCommunitySignals(cluster.query),
        fetchGoogleSearchSuggestions(cluster.seeds[0] || cluster.query),
      ]);

      trendSignals.push({
        category: cluster.category,
        archetype: cluster.archetype,
        industry: cluster.industry,
        query: cluster.query,
        articles: articles.slice(0, 4),
        hnStories: community.hnStories.slice(0, 3),
        githubRepos: community.githubRepos.slice(0, 3),
        suggestions: suggestions.slice(0, 5),
      });
    }

    const totalArticles = trendSignals.reduce((acc, s) => acc + s.articles.length, 0);
    const totalStories = trendSignals.reduce((acc, s) => acc + s.hnStories.length, 0);
    console.log(`✓ Harvested ${totalArticles} live news articles & ${totalStories} tech community discussions`);

    strategistPrompt = `You are the Principal Technology Editor & Growth Strategist for Inxora Studio (https://inxorastudio.com).
Inxora is a premier software engineering and UI/UX studio building high-performance web applications, mobile apps, design systems, and resilient cloud architectures.

Task: Formulate ${targetCount} unique, high-intent TREND & NEWS B2B article topics in Indonesian focusing on BREAKING TECH NEWS, FRAMEWORK UPDATES (Next.js, React, Node.js, AI models, cloud stacks), and DEVELOPER DISCUSSIONS.

Existing Articles to AVOID repeating:
${publishedTitles.slice(0, 15).map((t) => `- ${t}`).join("\n") || "- (None yet)"}

Live Trending News & Community Signals Harvested:
${trendSignals
  .map(
    (s) => `* Category [${s.category}] (${s.industry}) - Query: "${s.query}":
  Live Articles: ${s.articles.map((a) => `"${a.title}" (${a.source})`).join("; ") || "None"}
  HN Stories: ${s.hnStories.map((h) => `"${h.title}" (${h.points} pts)`).join("; ") || "None"}
  GitHub Repos: ${s.githubRepos.map((r) => `${r.name} (${r.stars}★)`).join(", ") || "None"}
  Search Suggestions: ${s.suggestions.join(", ") || "None"}`
  )
  .join("\n\n")}

CRITERIA FOR TREND_NEWS TOPICS:
1. Explain what is new, why it matters, architectural shifts, and practical migration/business impact in Indonesian.
2. Focus on framework major versions, language updates, runtime improvements, and agentic AI models.
3. Balance high technical credibility with executive business clarity (performance, security, costs, developer velocity).
4. Distribute across Inxora categories: "Web Development", "App Development", "UI/UX Design", "System Architecture", "Artificial Intelligence".
5. Assign appropriate narrative archetype ("strategic-comparison", "practical-guide", "business-innovation-insight", "cost-and-roi-blueprint", "problem-solver-checklist") and industry.

Return ONLY valid JSON matching this schema:
{
  "topics": [
    {
      "topic": "Judul Topik Trend/News yang Tajam, Menarik, dan Berbobot Teknis",
      "category": "Web Development / App Development / UI/UX Design / System Architecture / Artificial Intelligence",
      "archetype": "strategic-comparison / practical-guide / problem-solver-checklist / business-innovation-insight / cost-and-roi-blueprint",
      "industry": "sme-retail / b2b-saas / corporate-services / health-wellness / education-edutech",
      "targetKeyword": "kata kunci pencarian utama",
      "searchIntent": "Commercial Investigation / Practical Guide / Informational",
      "priority": "HIGH / MEDIUM / LOW"
    }
  ]
}`;
  } else {
    // GENERAL_EVERGREEN mode
    console.log(`\n[Discovery 2/3] Mode [GENERAL_EVERGREEN]: Querying Google Autocomplete across foundational clusters...`);
    const clusterSignals: Array<{
      clusterCategory: string;
      archetype: ArchetypeId;
      industry: IndustryId;
      suggestions: string[];
    }> = [];

    for (const cluster of EVERGREEN_KEYWORD_CLUSTERS) {
      const suggestionsSet = new Set<string>();
      for (const seed of cluster.seeds.slice(0, 3)) {
        const suggestions = await fetchGoogleSearchSuggestions(seed);
        for (const s of suggestions) {
          suggestionsSet.add(s);
        }
      }
      clusterSignals.push({
        clusterCategory: cluster.category,
        archetype: cluster.archetype,
        industry: cluster.industry,
        suggestions: Array.from(suggestionsSet).slice(0, 8),
      });
    }

    const totalSuggestions = clusterSignals.reduce((acc, c) => acc + c.suggestions.length, 0);
    console.log(`✓ Harvested ${totalSuggestions} live search suggestions from Google ID`);

    strategistPrompt = `You are the Chief Content Officer & Organic Growth Strategist for Inxora Studio (https://inxorastudio.com).
Inxora is a premier software engineering and UI/UX studio building high-performance web applications, mobile apps, design systems, and resilient cloud architectures.

Task: Formulate ${targetCount} unique, high-intent GENERAL EVERGREEN B2B article topics in Indonesian that business owners, beginner developers, and non-technical decision makers actively search on Google.

Existing Published Articles to AVOID repeating:
${publishedTitles.slice(0, 15).map((t) => `- ${t}`).join("\n") || "- (None yet)"}

Live Google Autocomplete Signals Harvested:
${clusterSignals.map((c) => `* Category [${c.clusterCategory}] (${c.industry}):\n  ${c.suggestions.slice(0, 5).join(", ")}`).join("\n")}

CRITERIA FOR GENERAL_EVERGREEN TOPICS:
1. Focus on simple, foundational topics with high organic search appeal:
   e.g. "Roadmap Web Developer 2026 untuk Pemula", "Mengapa Bisnis Anda Butuh Website Meski Sudah Punya Instagram", "Panduan Memilih Hosting untuk Pemilik Usaha", "Perbedaan Domain, Hosting, dan Cloud Storage dalam Bahasa Manusia".
2. Use clear, accessible language ("dalam Bahasa Manusia") without unnecessary jargon.
3. Solve foundational doubts: Why digital presence matters, budgeting/cost breakdown, tech choices for beginners, checklist vendor.
4. Distribute across Inxora categories: "Web Development", "App Development", "UI/UX Design", "System Architecture", "Technology".
5. Assign appropriate narrative archetype ("practical-guide", "strategic-comparison", "problem-solver-checklist", "business-innovation-insight", "cost-and-roi-blueprint") and industry.

Return ONLY valid JSON matching this schema:
{
  "topics": [
    {
      "topic": "Judul Topik Evergreen yang Sederhana, Bernilai Tinggi, dan Menjawab Pertanyaan Pemula/Bisnis",
      "category": "Web Development / App Development / UI/UX Design / System Architecture / Technology",
      "archetype": "practical-guide / strategic-comparison / problem-solver-checklist / business-innovation-insight / cost-and-roi-blueprint",
      "industry": "sme-retail / b2b-saas / corporate-services / health-wellness / education-edutech",
      "targetKeyword": "kata kunci pencarian utama",
      "searchIntent": "Commercial Investigation / Practical Guide / Informational",
      "priority": "HIGH / MEDIUM / LOW"
    }
  ]
}`;
  }

  let discoveredTopics: BacklogTopicItem[] = [];

  try {
    const responseText = await createChatCompletion(
      [
        { role: "system", content: "You are a senior organic SEO strategist for tech agencies. Output pure JSON." },
        { role: "user", content: strategistPrompt },
      ],
      {
        model: config.architectModel || config.defaultModel,
        fallbackModel: config.reviewerFallbackModel || config.defaultModel,
        temperature: 0.4,
        timeoutMs: 60000,
      }
    );

    const parsed = extractJSON<{ topics: Array<Omit<BacklogTopicItem, "id" | "status" | "createdAt">> }>(responseText);
    if (parsed.topics && Array.isArray(parsed.topics)) {
      discoveredTopics = parsed.topics.map((t, idx) => ({
        id: `topic-${Date.now()}-${idx + 1}`,
        topic: t.topic,
        category: t.category,
        archetype: t.archetype,
        industry: t.industry,
        targetKeyword: t.targetKeyword,
        searchIntent: t.searchIntent,
        priority: t.priority || "MEDIUM",
        status: "QUEUED",
        researchMode: mode,
        createdAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("⚠️ AI Topic Strategist call encountered an issue, falling back to curated bank:", err);
  }

  // Fallback to high-quality curated seed bank if LLM produced empty list
  if (discoveredTopics.length === 0) {
    console.log(`  ↳ Populating backlog from verified curated bank for mode [${mode}]...`);
    if (mode === "TREND_NEWS") {
      const fallbackTrendBank: Array<Omit<BacklogTopicItem, "id" | "status" | "createdAt">> = [
        {
          topic: "Next.js 15 dan React 19: Analisis Fitur Baru, Performa Server Components, dan Panduan Migrasi Bisnis",
          category: "Web Development",
          archetype: "strategic-comparison",
          industry: "corporate-services",
          targetKeyword: "next js 15 react 19 fitur baru migrasi",
          searchIntent: "Practical Guide",
          priority: "HIGH",
          researchMode: "TREND_NEWS",
        },
        {
          topic: "Agentic AI di 2026: Bagaimana Sistem AI Otonom Mentransformasi Workflow Rekayasa Perangkat Lunak",
          category: "Artificial Intelligence",
          archetype: "business-innovation-insight",
          industry: "b2b-saas",
          targetKeyword: "agentic ai software engineering workflow",
          searchIntent: "Commercial Investigation",
          priority: "HIGH",
          researchMode: "TREND_NEWS",
        },
        {
          topic: "Node.js Modern vs Runtime Alternatif: Evaluasi Kecepatan, Kompatibilitas, dan Efisiensi Server",
          category: "System Architecture",
          archetype: "strategic-comparison",
          industry: "corporate-services",
          targetKeyword: "node js modern vs runtime alternatif",
          searchIntent: "Commercial Investigation",
          priority: "MEDIUM",
          researchMode: "TREND_NEWS",
        },
        {
          topic: "Tren Arsitektur Cloud 2026: Menghindari Vendor Lock-in dan Memangkas Biaya Infrastruktur",
          category: "System Architecture",
          archetype: "cost-and-roi-blueprint",
          industry: "b2b-saas",
          targetKeyword: "arsitektur cloud hemat biaya vendor lock in",
          searchIntent: "Commercial Investigation",
          priority: "HIGH",
          researchMode: "TREND_NEWS",
        },
        {
          topic: "TypeScript Modern untuk Tim Skala Menengah: Praktik Terbaik Type Safety dan Produktivitas Developer",
          category: "Web Development",
          archetype: "practical-guide",
          industry: "corporate-services",
          targetKeyword: "typescript best practices tim developer",
          searchIntent: "Practical Guide",
          priority: "MEDIUM",
          researchMode: "TREND_NEWS",
        },
        {
          topic: "Flutter vs React Native di 2026: Perbandingan Performa dan Ekosistem untuk Aplikasi Bisnis",
          category: "App Development",
          archetype: "strategic-comparison",
          industry: "b2b-saas",
          targetKeyword: "flutter vs react native aplikasi bisnis 2026",
          searchIntent: "Commercial Investigation",
          priority: "HIGH",
          researchMode: "TREND_NEWS",
        },
      ];

      discoveredTopics = fallbackTrendBank.map((t, idx) => ({
        id: `topic-${Date.now()}-${idx + 1}`,
        ...t,
        status: "QUEUED",
        createdAt: new Date().toISOString(),
      }));
    } else {
      const fallbackEvergreenBank: Array<Omit<BacklogTopicItem, "id" | "status" | "createdAt">> = [
        {
          topic: "Roadmap Web Developer 2026 untuk Pemula: Panduan Lengkap dari Nol hingga Mahir",
          category: "Web Development",
          archetype: "practical-guide",
          industry: "education-edutech",
          targetKeyword: "roadmap web developer 2026 pemula",
          searchIntent: "Practical Guide",
          priority: "HIGH",
          researchMode: "GENERAL_EVERGREEN",
        },
        {
          topic: "Mengapa Bisnis Anda Butuh Website Meski Sudah Punya Instagram dan Media Sosial",
          category: "Web Development",
          archetype: "business-innovation-insight",
          industry: "sme-retail",
          targetKeyword: "mengapa bisnis butuh website instagram",
          searchIntent: "Commercial Investigation",
          priority: "HIGH",
          researchMode: "GENERAL_EVERGREEN",
        },
        {
          topic: "Panduan Memilih Hosting untuk Pemilik Usaha: Shared, VPS, atau Cloud Terkelola?",
          category: "System Architecture",
          archetype: "strategic-comparison",
          industry: "corporate-services",
          targetKeyword: "panduan memilih hosting pemilik usaha",
          searchIntent: "Commercial Investigation",
          priority: "HIGH",
          researchMode: "GENERAL_EVERGREEN",
        },
        {
          topic: "Perbedaan Domain, Hosting, dan Cloud Storage dalam Bahasa Manusia yang Mudah Dipahami",
          category: "System Architecture",
          archetype: "practical-guide",
          industry: "education-edutech",
          targetKeyword: "perbedaan domain hosting cloud storage bahasa manusia",
          searchIntent: "Informational",
          priority: "HIGH",
          researchMode: "GENERAL_EVERGREEN",
        },
        {
          topic: "Panduan Memilih Tech Stack Website Bisnis: Next.js vs Alternatif Tradisional",
          category: "Web Development",
          archetype: "strategic-comparison",
          industry: "corporate-services",
          targetKeyword: "tech stack website bisnis next js",
          searchIntent: "Commercial Investigation",
          priority: "HIGH",
          researchMode: "GENERAL_EVERGREEN",
        },
        {
          topic: "Checklist Audit UI/UX Aplikasi Bisnis: 10 Parameter Penentu Tingkat Retensi Pengguna",
          category: "UI/UX Design",
          archetype: "problem-solver-checklist",
          industry: "sme-retail",
          targetKeyword: "audit ui ux aplikasi bisnis",
          searchIntent: "Practical Guide",
          priority: "HIGH",
          researchMode: "GENERAL_EVERGREEN",
        },
      ];

      discoveredTopics = fallbackEvergreenBank.map((t, idx) => ({
        id: `topic-${Date.now()}-${idx + 1}`,
        ...t,
        status: "QUEUED",
        createdAt: new Date().toISOString(),
      }));
    }
  }

  // Filter out any duplicates against existing backlog or published posts
  const newItems: BacklogTopicItem[] = [];
  for (const item of discoveredTopics) {
    const norm = item.topic.toLowerCase();
    const isPublished = publishedTitles.some((pt) => pt.includes(norm) || norm.includes(pt));
    const isAlreadyQueued = backlogTitles.some((bt) => bt.includes(norm) || norm.includes(bt));

    if (!isPublished && !isAlreadyQueued) {
      newItems.push(item);
      backlogTitles.push(norm);
    }
  }

  const updatedBacklog = [...existingBacklog, ...newItems];
  saveBacklog(updatedBacklog);

  console.log(`\n🎉 TOPIC DISCOVERY COMPLETE! [Mode: ${mode}]`);
  console.log(`✓ Added to Backlog : ${newItems.length} fresh queued topics`);
  console.log(`✓ Total in Backlog : ${updatedBacklog.length} items (${updatedBacklog.filter((b) => b.status === "QUEUED").length} queued)`);
  console.log(`✓ Saved to File    : ${BACKLOG_FILE_PATH}`);
  console.log(`=========================================================\n`);

  return newItems;
}

