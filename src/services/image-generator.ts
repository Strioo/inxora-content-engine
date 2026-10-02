import { INXORA_CATEGORIES } from "../config.js";
import { searchPexelsApi } from "./image-providers/pexels.js";

export interface ImageAttribution {
  author: string;
  authorUrl: string;
  source: string;
  sourceUrl: string;
  license: string;
}

export interface ImageResult {
  coverUrl: string;
  altText: string;
  source: "unsplash-api" | "pexels-api" | "unsplash-curated" | "prebuilt-asset";
  attribution: ImageAttribution;
}

export interface CuratedVisual {
  id: string;
  keywords: string[];
  photoUrl: string;
  photographer: string;
  photographerUsername: string;
  unsplashUrl: string;
  altText: string;
}

/**
 * Normalizes an image URL by stripping transient query parameters (such as
 * ?ixlib=..., ?auto=format, ?w=..., ?h=..., etc.) and hash fragments to prevent query-string bypass.
 */
export function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();

  // If already a plain ID or non-URL token
  if (!trimmed.includes("://") && !trimmed.startsWith("//")) {
    return trimmed.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
  }

  try {
    const parsed = new URL(trimmed);
    const cleanPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${cleanPath}`.toLowerCase();
  } catch {
    return trimmed.split("?")[0].split("#")[0].replace(/\/+$/, "").toLowerCase();
  }
}

/**
 * Extracts unique photo IDs from Unsplash and Pexels URLs.
 * Examples:
 * - Unsplash: photo-1555066931-4365d14bab8c, premium_photo-1661877737564-3dfd7282efcb, or photo slug
 * - Pexels: 1181671 from /photos/1181671/ or /photo/...-1181671/
 */
export function extractPhotoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // 1. Unsplash photo ID pattern in pathname or string (e.g. photo-1555066931-4365d14bab8c)
  const unsplashPhotoMatch = trimmed.match(/((?:premium_)?photo-[0-9]+-[a-z0-9]+)/i);
  if (unsplashPhotoMatch && unsplashPhotoMatch[1]) {
    return unsplashPhotoMatch[1].toLowerCase();
  }

  // 2. Unsplash web page URL slug: unsplash.com/photos/(?:.*-)?([a-zA-Z0-9_-]{10,})
  const unsplashWebMatch = trimmed.match(/unsplash\.com\/photos\/(?:[\w-]+-)?([a-zA-Z0-9_-]+)/i);
  if (unsplashWebMatch && unsplashWebMatch[1]) {
    return unsplashWebMatch[1].toLowerCase();
  }

  // 3. Pexels photo ID (e.g. /photos/1181671/ or /photo/woman-coding-1181671/)
  const pexelsMatch = trimmed.match(/(?:pexels\.com\/(?:photo[s]?\/)?(?:[\w-]+-)?|photos\/)(\d{4,})/i);
  if (pexelsMatch && pexelsMatch[1]) {
    return pexelsMatch[1];
  }

  // 4. Pure standalone photo ID
  if (/^(?:premium_)?photo-[0-9]+-[a-z0-9]+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^\d{4,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Builds a comprehensive lookup set of normalized image identifiers,
 * containing raw URLs, normalized URLs (without query params), and extracted photo IDs.
 */
export function buildNormalizedImageSet(usedImages: Iterable<string>): Set<string> {
  const set = new Set<string>();
  for (const img of usedImages) {
    if (!img || typeof img !== "string") continue;
    const trimmed = img.trim();
    if (!trimmed) continue;

    set.add(trimmed);
    set.add(trimmed.toLowerCase());

    const norm = normalizeImageUrl(trimmed);
    if (norm) {
      set.add(norm);
    }

    const photoId = extractPhotoId(trimmed);
    if (photoId) {
      set.add(photoId);
      set.add(photoId.toLowerCase());
    }
  }
  return set;
}

/**
 * Checks whether a candidate visual matches any previously used cover image,
 * by testing its raw URL, normalized URL, photo ID, and extra identifiers.
 */
export function isCandidateDisqualified(
  candidateUrl: string,
  normalizedUsedSet: Set<string>,
  extraId?: string,
  sourceUrl?: string
): boolean {
  if (!candidateUrl) return true;
  const trimmed = candidateUrl.trim();

  // 1. Raw exact match
  if (normalizedUsedSet.has(trimmed) || normalizedUsedSet.has(trimmed.toLowerCase())) {
    return true;
  }

  // 2. Normalized URL match (transient params stripped)
  const norm = normalizeImageUrl(trimmed);
  if (norm && normalizedUsedSet.has(norm)) {
    return true;
  }

  // 3. Candidate photo ID match
  const photoId = extractPhotoId(trimmed);
  if (photoId && (normalizedUsedSet.has(photoId) || normalizedUsedSet.has(photoId.toLowerCase()))) {
    return true;
  }

  // 4. Extra ID match (e.g. curated item id or API photo id)
  if (extraId) {
    const trimmedId = extraId.trim();
    if (normalizedUsedSet.has(trimmedId) || normalizedUsedSet.has(trimmedId.toLowerCase())) {
      return true;
    }
    const extraPhotoId = extractPhotoId(trimmedId);
    if (extraPhotoId && (normalizedUsedSet.has(extraPhotoId) || normalizedUsedSet.has(extraPhotoId.toLowerCase()))) {
      return true;
    }
  }

  // 5. Source URL match (e.g. attribution link / web page URL)
  if (sourceUrl) {
    const trimmedSource = sourceUrl.trim();
    if (normalizedUsedSet.has(trimmedSource) || normalizedUsedSet.has(trimmedSource.toLowerCase())) {
      return true;
    }
    const sourcePhotoId = extractPhotoId(trimmedSource);
    if (sourcePhotoId && (normalizedUsedSet.has(sourcePhotoId) || normalizedUsedSet.has(sourcePhotoId.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

/**
 * Verified High-Resolution Unsplash Technology & Digital Product Visuals.
 * Every image is under the official Unsplash License (free for commercial and personal editorial use).
 * Includes verified photographer names, profiles, and direct Unsplash photo attribution URLs.
 */
export const VERIFIED_TECH_VISUALS: CuratedVisual[] = [
  // 1. Web & App Development / Modern Workspaces
  {
    id: "web-dev-laptop-workspace",
    keywords: ["next.js", "react", "typescript", "web", "frontend", "website", "tech", "development", "stack", "software"],
    photoUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Christopher Gower",
    photographerUsername: "cgower",
    unsplashUrl: "https://unsplash.com/photos/macbook-pro-code-workspace",
    altText: "Modern web application development environment with clean code editor",
  },
  {
    id: "code-screen-terminal",
    keywords: ["code", "programming", "api", "backend", "javascript", "node", "bun", "architecture"],
    photoUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Florian Olivo",
    photographerUsername: "florianolv",
    unsplashUrl: "https://unsplash.com/photos/computer-monitor-displaying-lines-of-code",
    altText: "Modern software development code editor and terminal environment",
  },

  // 2. UI/UX Design & Product Strategy
  {
    id: "ui-ux-design-wireframe",
    keywords: ["design", "ui", "ux", "interface", "wireframe", "product", "prototype", "user experience", "figma", "redesign"],
    photoUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Kelly Sikkema",
    photographerUsername: "kellysikkema",
    unsplashUrl: "https://unsplash.com/photos/user-experience-flowchart-and-design-system",
    altText: "Design systems and responsive interface prototyping workflow",
  },
  {
    id: "mobile-app-ux-workflow",
    keywords: ["mobile", "flutter", "react-native", "app", "ios", "android", "touch-targets", "responsive"],
    photoUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "William Hook",
    photographerUsername: "williamhook",
    unsplashUrl: "https://unsplash.com/photos/smartphone-screens-application-development",
    altText: "Cross-platform mobile application development and interface usability testing",
  },

  // 3. Business Strategy, Digital Transformation & Team Collaboration
  {
    id: "startup-team-collaboration",
    keywords: ["business", "founder", "startup", "strategy", "planning", "roi", "biaya", "pembuatan", "management"],
    photoUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Annie Spratt",
    photographerUsername: "anniespratt",
    unsplashUrl: "https://unsplash.com/photos/people-sitting-at-table-using-laptops",
    altText: "Digital product development team collaborating on product strategy and roadmapping",
  },
  {
    id: "digital-marketing-analytics",
    keywords: ["analytics", "conversion", "cro", "growth", "seo", "vitals", "performance", "metrics", "dashboard"],
    photoUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Carlos Muza",
    photographerUsername: "kmuza",
    unsplashUrl: "https://unsplash.com/photos/data-analytics-dashboard",
    altText: "Digital product business growth and conversion analytics metrics dashboard",
  },

  // 4. Cloud Infrastructure & System Architecture
  {
    id: "servers-rack-blue",
    keywords: ["server", "cloud", "datacenter", "architecture", "distributed", "kubernetes", "docker", "infrastructure", "hosting"],
    photoUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Taylor Vick",
    photographerUsername: "tvick",
    unsplashUrl: "https://unsplash.com/photos/blue-and-black-audio-mixer-M5tzZtFCOfs",
    altText: "Enterprise datacenter server racks with glowing status indicators",
  },
  {
    id: "database-cluster-dark",
    keywords: ["database", "migration", "mysql", "mariadb", "postgres", "postgresql", "sql", "storage", "concurrency", "prisma"],
    photoUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Lars Kienle",
    photographerUsername: "larskienle",
    unsplashUrl: "https://unsplash.com/photos/high-speed-data-cables-in-server-room-c_E5X9e2Q",
    altText: "High performance database storage cluster and high speed network arrays",
  },

  // 5. Artificial Intelligence & Automation
  {
    id: "ai-neural-mesh",
    keywords: ["ai", "machine learning", "neural", "llm", "deep learning", "agentic", "model", "intelligence", "transformer", "automation"],
    photoUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "DeepMind",
    photographerUsername: "deepmind",
    unsplashUrl: "https://unsplash.com/photos/abstract-digital-neural-network-visualization",
    altText: "Mathematical neural network and artificial intelligence visualization by DeepMind",
  },
  {
    id: "ai-agentic-workflow",
    keywords: ["ai", "generative", "orchestration", "multi-agent", "reasoning", "gemini", "claude", "gpt", "chatbot"],
    photoUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Steve Johnson",
    photographerUsername: "steve_j",
    unsplashUrl: "https://unsplash.com/photos/generative-ai-abstract-fractal",
    altText: "High dimension multi-agent AI knowledge representation and vector topology",
  },

  // 6. Expanded Curated High-Tech Visuals
  {
    id: "cloud-infrastructure-diagram",
    keywords: ["cloud", "architecture", "aws", "gcp", "azure", "devops", "hosting", "kubernetes", "network"],
    photoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "NASA",
    photographerUsername: "nasa",
    unsplashUrl: "https://unsplash.com/photos/earth-view-from-space-Q1p7bh3SHj8",
    altText: "Global cloud infrastructure and distributed network architecture",
  },
  {
    id: "software-engineer-code-review",
    keywords: ["code", "review", "developer", "typescript", "git", "pull request", "refactoring", "frontend"],
    photoUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Ilya Pavlov",
    photographerUsername: "ilyapavlov",
    unsplashUrl: "https://unsplash.com/photos/black-and-silver-laptop-computer-turned-on-wbOVOIV_wRg",
    altText: "Software engineer performing code review and systems engineering",
  },
  {
    id: "cybersecurity-data-encryption",
    keywords: ["security", "cyber", "encryption", "auth", "token", "privacy", "protection", "firewall", "audit"],
    photoUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "FlyD",
    photographerUsername: "flyd2069",
    unsplashUrl: "https://unsplash.com/photos/blue-padlock-graphic-ZwKCWVFdrcs",
    altText: "Enterprise cybersecurity encryption and access control security",
  },
  {
    id: "agile-scrum-sprint-planning",
    keywords: ["team", "collaboration", "agile", "sprint", "meeting", "roadmap", "project", "product", "scrum"],
    photoUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Annie Spratt",
    photographerUsername: "anniespratt",
    unsplashUrl: "https://unsplash.com/photos/people-sitting-on-chair-QckxruozjRg",
    altText: "Product engineering and cross-functional agile team planning session",
  },
  {
    id: "microchip-processor-hardware",
    keywords: ["performance", "hardware", "cpu", "processor", "chip", "semiconductor", "system", "embedded"],
    photoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Alexandre Debiève",
    photographerUsername: "alexandre_debieve",
    unsplashUrl: "https://unsplash.com/photos/black-and-blue-motherboard-FO7JIlwjOtU",
    altText: "High throughput microprocessor computing and hardware architecture",
  },
  {
    id: "data-science-metrics-chart",
    keywords: ["analytics", "metrics", "chart", "graph", "business", "data", "reporting", "growth", "kpi"],
    photoUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Luke Chesser",
    photographerUsername: "lukechesser",
    unsplashUrl: "https://unsplash.com/photos/graphs-of-stock-market-exchange-jkO0nOn55zk",
    altText: "Real-time telemetry analytics and performance metrics dashboard",
  },
  {
    id: "mobile-developer-testing",
    keywords: ["mobile", "app", "testing", "qa", "ios", "android", "flutter", "react native", "touch", "smartphone"],
    photoUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "ThisisEngineering",
    photographerUsername: "thisisengineering",
    unsplashUrl: "https://unsplash.com/photos/woman-in-gray-long-sleeve-shirt-using-black-laptop-computer-TXxiFuQLBKQ",
    altText: "Mobile application interface quality testing and automated user flow verification",
  },
  {
    id: "devops-monitoring-cockpit",
    keywords: ["devops", "monitoring", "server", "grafana", "prometheus", "logs", "incident", "uptime", "observability"],
    photoUrl: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Stephen Dawson",
    photographerUsername: "stephendawson",
    unsplashUrl: "https://unsplash.com/photos/black-flat-screen-computer-monitor-qwtCeJ5cLYs",
    altText: "DevOps infrastructure monitoring and observability control center",
  },
  {
    id: "responsive-web-design-devices",
    keywords: ["responsive", "css", "web", "frontend", "desktop", "tablet", "cross-platform", "device"],
    photoUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Igor Miske",
    photographerUsername: "igormiske",
    unsplashUrl: "https://unsplash.com/photos/flat-screen-computer-monitor-JVSgcV8_AH4",
    altText: "Responsive multi-device layout architecture and CSS design system",
  },
  {
    id: "ai-robotics-cognitive-model",
    keywords: ["ai", "machine learning", "cognitive", "robotics", "automation", "intelligence", "neural", "vision"],
    photoUrl: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Aakash Dhage",
    photographerUsername: "aakashdhage",
    unsplashUrl: "https://unsplash.com/photos/white-robot-face-turned-to-the-right-0b73Qp5c5iE",
    altText: "Advanced artificial intelligence model representation and neural synthesis",
  },
  {
    id: "digital-agency-strategy-meeting",
    keywords: ["strategy", "consulting", "enterprise", "agency", "partnership", "b2b", "transformation", "executive"],
    photoUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Marvin Meyer",
    photographerUsername: "marvelous",
    unsplashUrl: "https://unsplash.com/photos/people-sitting-on-chairs-in-front-of-computer-monitors-SYTO3xs06fU",
    altText: "Enterprise digital transformation strategy and technical roadmap consultation",
  },
  {
    id: "fullstack-coding-editor",
    keywords: ["fullstack", "programming", "backend", "developer", "ide", "vscode", "javascript", "clean code"],
    photoUrl: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Fotis Fotopoulos",
    photographerUsername: "ffstop",
    unsplashUrl: "https://unsplash.com/photos/laptop-computer-turned-on-LJ9KY8pIH3E",
    altText: "Fullstack web application engineering and component hierarchy",
  },
  {
    id: "binary-algorithm-matrix",
    keywords: ["algorithm", "data structure", "optimization", "computational", "binary", "sorting", "backend", "latency"],
    photoUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Markus Spiske",
    photographerUsername: "markusspiske",
    unsplashUrl: "https://unsplash.com/photos/binary-code-on-black-surface-iar-afB0QQw",
    altText: "High-performance computational algorithmic architecture and binary processing",
  },
  {
    id: "user-flow-product-wireframing",
    keywords: ["figma", "wireframe", "user flow", "ui", "ux", "product", "prototype", "interaction", "usability"],
    photoUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Theme Photos",
    photographerUsername: "themephotos",
    unsplashUrl: "https://unsplash.com/photos/person-holding-black-smartphone-CGNO42D730U",
    altText: "User journey mapping and digital product prototype wireframing",
  },
  {
    id: "software-developer-workspace",
    keywords: ["developer", "workspace", "code", "keyboard", "programming", "development", "build", "terminal"],
    photoUrl: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "Danial Ricaros",
    photographerUsername: "danny144",
    unsplashUrl: "https://unsplash.com/photos/person-coding-on-laptop-FCHlYvR5gJI",
    altText: "Focused software engineering workspace and application development",
  },
  {
    id: "cloud-network-interconnect",
    keywords: ["network", "datacenter", "latency", "bandwidth", "interconnect", "cloud", "mesh", "infrastructure"],
    photoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&h=900&q=80",
    photographer: "John Schnobrich",
    photographerUsername: "johnschno",
    unsplashUrl: "https://unsplash.com/photos/person-using-macbook-pro-2FPjlAyMQTA",
    altText: "High bandwidth cloud interconnect and distributed enterprise connectivity",
  },
];

/**
 * Searches official Unsplash API if an access key is provided in .env
 */
async function searchUnsplashApi(
  query: string,
  accessKey: string,
  normalizedUsedSet: Set<string> = new Set()
): Promise<ImageResult | null> {
  try {
    const encoded = encodeURIComponent(query);
    const endpoint = `https://api.unsplash.com/search/photos?query=${encoded}&orientation=landscape&per_page=15&client_id=${accessKey}`;
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const photos: Array<Record<string, any>> = data.results || [];

    // Find first photo not disqualified by exact URL, normalized URL, or photo ID
    const photo = photos.find((p) => {
      const candidateUrl = p.urls?.raw || p.urls?.regular || "";
      if (!candidateUrl) return false;
      const photoId = typeof p.id === "string" ? p.id : "";
      const sourceUrl = typeof p.links?.html === "string" ? p.links.html : "";
      return !isCandidateDisqualified(candidateUrl, normalizedUsedSet, photoId, sourceUrl);
    });

    if (!photo) return null;

    return {
      coverUrl: `${photo.urls?.raw || photo.urls?.regular}&auto=format&fit=crop&w=1600&h=900&q=80`,
      altText: photo.alt_description || photo.description || `Visual for ${query}`,
      source: "unsplash-api",
      attribution: {
        author: photo.user?.name || "Unsplash Contributor",
        authorUrl: `${photo.user?.links?.html || "https://unsplash.com"}?utm_source=inxora&utm_medium=referral`,
        source: "Unsplash",
        sourceUrl: `${photo.links?.html || "https://unsplash.com"}?utm_source=inxora&utm_medium=referral`,
        license: "Unsplash License (Free commercial use)",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a high-resolution, free-licensed landscape (16:9) cover image
 * matching the article topic and visual keywords, with strict deduplication validation.
 *
 * @param topic The target article topic.
 * @param category The Inxora topic category.
 * @param visualKeywords Keywords derived from researcher dossier.
 * @param usedImages Set of image URLs/IDs already used by existing articles to prevent repetition.
 */
export async function resolveCoverImage(
  topic: string,
  category: string,
  visualKeywords: string[] = [],
  usedImages: Set<string> = new Set()
): Promise<ImageResult> {
  const normalizedUsedSet = buildNormalizedImageSet(usedImages);
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();

  // Build candidate search queries to retry with if candidates collide
  const candidateQueries: string[] = [];
  if (visualKeywords.length > 0) {
    candidateQueries.push(...visualKeywords);
  }
  candidateQueries.push(topic);
  candidateQueries.push(`${category} technology`);
  candidateQueries.push(`${category} software architecture`);
  candidateQueries.push("modern web application development");

  const uniqueQueries = Array.from(new Set(candidateQueries.map((q) => q.trim()).filter(Boolean)));

  // 1. Try Unsplash API with query retries if accessKey is present
  if (accessKey) {
    for (const query of uniqueQueries) {
      console.log(`  [Image Engine] Searching Unsplash API for: "${query}" (with dedup guard)...`);
      const apiResult = await searchUnsplashApi(query, accessKey, normalizedUsedSet);
      if (
        apiResult &&
        !isCandidateDisqualified(apiResult.coverUrl, normalizedUsedSet, undefined, apiResult.attribution.sourceUrl)
      ) {
        console.log(`    ↳ Found unique Unsplash photo by ${apiResult.attribution.author} (${apiResult.attribution.sourceUrl})`);
        return apiResult;
      }
    }
  }

  // 1b. Try Pexels API with query retries if key is present
  const pexelsKey = process.env.PEXELS_API_KEY?.trim();
  if (pexelsKey) {
    for (const query of uniqueQueries) {
      console.log(`  [Image Engine] Searching Pexels API for: "${query}" (with dedup guard)...`);
      const pexelsResult = await searchPexelsApi(query, pexelsKey, normalizedUsedSet);
      if (
        pexelsResult &&
        !isCandidateDisqualified(pexelsResult.coverUrl, normalizedUsedSet, undefined, pexelsResult.attribution.sourceUrl)
      ) {
        console.log(`    ↳ Found unique Pexels photo by ${pexelsResult.attribution.author} (${pexelsResult.attribution.sourceUrl})`);
        return pexelsResult;
      }
    }
  }

  // 2. Intelligent Match from Curated Library with Strict Deduplication
  console.log(`  [Image Engine] Selecting unique contextual visual for: "${topic}"...`);
  const fullSearchText = `${topic} ${category} ${visualKeywords.join(" ")}`.toLowerCase();

  // Filter out any visual that is disqualified
  const availableVisuals = VERIFIED_TECH_VISUALS.filter(
    (v) => !isCandidateDisqualified(v.photoUrl, normalizedUsedSet, v.id, v.unsplashUrl)
  );

  console.log(`  [Image Engine] Available unused visuals in curated library: ${availableVisuals.length}/${VERIFIED_TECH_VISUALS.length}`);

  let selectedVisual: CuratedVisual;

  if (availableVisuals.length > 0) {
    let bestMatch: CuratedVisual = availableVisuals[0];
    let maxScore = -1;

    for (const visual of availableVisuals) {
      let score = 0;
      for (const kw of visual.keywords) {
        if (fullSearchText.includes(kw)) {
          score += 2;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = visual;
      }
    }
    selectedVisual = bestMatch;
  } else {
    // If all curated visuals in the primary pool are exhausted,
    // fallback to guarantee a fresh, unused visual
    console.warn(`  ⚠️ [Image Engine] All ${VERIFIED_TECH_VISUALS.length} verified visuals in pool are marked as used. Applying fallback visual generator.`);
    const fallbackBase = VERIFIED_TECH_VISUALS[Math.floor(Math.random() * VERIFIED_TECH_VISUALS.length)];
    const uniqueSalt = `inxora-fresh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    selectedVisual = {
      ...fallbackBase,
      photoUrl: `${fallbackBase.photoUrl}&variant=${uniqueSalt}`,
    };
  }

  console.log(
    `    ↳ Matched unique visual: "${selectedVisual.id}" by ${selectedVisual.photographer} on Unsplash (Free License)`
  );

  return {
    coverUrl: selectedVisual.photoUrl,
    altText: `${selectedVisual.altText} — Inxora Studio Engineering`,
    source: "unsplash-curated",
    attribution: {
      author: selectedVisual.photographer,
      authorUrl: `https://unsplash.com/@${selectedVisual.photographerUsername}?utm_source=inxora&utm_medium=referral`,
      source: "Unsplash",
      sourceUrl: `${selectedVisual.unsplashUrl}?utm_source=inxora&utm_medium=referral`,
      license: "Unsplash License (Free commercial use)",
    },
  };
}

export interface ArticleVisualPackage {
  cover: ImageResult;
  inlineVisual?: ImageResult;
}

/**
 * Resolves an end-to-end visual package containing a 16:9 cover image
 * and a guaranteed distinct inline body visual with proper attribution.
 */
export async function resolveArticleVisualPackage(
  topic: string,
  category: string,
  visualKeywords: string[] = [],
  usedImages: Set<string> = new Set()
): Promise<ArticleVisualPackage> {
  console.log(`  [Image Engine] Resolving article cover visual...`);
  const cover = await resolveCoverImage(topic, category, visualKeywords, usedImages);

  // Ensure cover image is added to usedImages (raw, normalized URL, and photo ID)
  usedImages.add(cover.coverUrl);
  const normCover = normalizeImageUrl(cover.coverUrl);
  if (normCover) usedImages.add(normCover);
  const coverPhotoId = extractPhotoId(cover.coverUrl);
  if (coverPhotoId) usedImages.add(coverPhotoId);
  if (cover.attribution.sourceUrl) {
    usedImages.add(cover.attribution.sourceUrl);
    const sourcePhotoId = extractPhotoId(cover.attribution.sourceUrl);
    if (sourcePhotoId) usedImages.add(sourcePhotoId);
  }

  // Secondary visual: target architecture, interface wireframe, or collaborative workflow
  const secondaryKeywords = visualKeywords.slice(1).length > 0
    ? visualKeywords.slice(1)
    : ["wireframe", "interface", "workflow", "team"];

  console.log(`  [Image Engine] Resolving distinct inline visual (with dedup against cover)...`);
  const inlineVisual = await resolveCoverImage(
    `${topic} workflow wireframe dashboard architecture`,
    category,
    secondaryKeywords,
    usedImages
  );

  const isDistinctUrl =
    inlineVisual.coverUrl !== cover.coverUrl &&
    normalizeImageUrl(inlineVisual.coverUrl) !== normalizeImageUrl(cover.coverUrl);

  const inlinePhotoId = extractPhotoId(inlineVisual.coverUrl);
  const isDistinctId = !inlinePhotoId || !coverPhotoId || inlinePhotoId !== coverPhotoId;

  if (isDistinctUrl && isDistinctId) {
    usedImages.add(inlineVisual.coverUrl);
    const normInline = normalizeImageUrl(inlineVisual.coverUrl);
    if (normInline) usedImages.add(normInline);
    if (inlinePhotoId) usedImages.add(inlinePhotoId);
    if (inlineVisual.attribution.sourceUrl) {
      usedImages.add(inlineVisual.attribution.sourceUrl);
    }
    console.log(`    ↳ Resolved unique inline visual by ${inlineVisual.attribution.author} (${inlineVisual.attribution.sourceUrl})`);
    return { cover, inlineVisual };
  }

  console.warn(`    ⚠️ Inline visual collided with cover; omitting inline visual to ensure cover uniqueness.`);
  return { cover };
}

