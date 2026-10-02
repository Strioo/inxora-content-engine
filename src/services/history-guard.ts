import fs from "fs";
import path from "path";

export interface ArticleHistoryItem {
  title: string;
  slug: string;
  category?: string;
  publishedAt?: string;
  coverImage?: string;
}

const LOCAL_HISTORY_FILE = path.resolve(process.cwd(), "data", "published-history.json");

function ensureDataDirectory() {
  const dir = path.dirname(LOCAL_HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadLocalHistory(): ArticleHistoryItem[] {
  try {
    ensureDataDirectory();
    if (fs.existsSync(LOCAL_HISTORY_FILE)) {
      const raw = fs.readFileSync(LOCAL_HISTORY_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[HistoryGuard] Could not read local history cache:", err);
  }
  return [];
}

export function recordArticleInHistory(item: ArticleHistoryItem) {
  try {
    ensureDataDirectory();
    const existing = loadLocalHistory();
    const filtered = existing.filter((p) => p.slug !== item.slug);
    filtered.unshift({
      ...item,
      publishedAt: item.publishedAt || new Date().toISOString(),
    });
    // Keep last 50 articles in cache
    fs.writeFileSync(LOCAL_HISTORY_FILE, JSON.stringify(filtered.slice(0, 50), null, 2), "utf-8");
  } catch (err) {
    console.warn("[HistoryGuard] Could not record article in history cache:", err);
  }
}

/**
 * Reads local history, daemon state, and the remote content-context API
 * to build a consolidated set of all known used cover image URLs.
 */
export async function getAllUsedCoverImages(apiUrl?: string): Promise<Set<string>> {
  const usedImages = new Set<string>();

  // 1. Read local history (data/published-history.json)
  try {
    const localArticles = loadLocalHistory();
    for (const article of localArticles) {
      if (article.coverImage && typeof article.coverImage === "string") {
        const trimmed = article.coverImage.trim();
        if (trimmed) {
          usedImages.add(trimmed);
        }
      }
    }
  } catch (err) {
    console.warn("[HistoryGuard] Could not extract cover images from local history:", err);
  }

  // 2. Read daemon state (data/daemon-state.json) if available
  try {
    const daemonStateFile = path.resolve(process.cwd(), "data", "daemon-state.json");
    if (fs.existsSync(daemonStateFile)) {
      const raw = fs.readFileSync(daemonStateFile, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.history)) {
        for (const entry of parsed.history) {
          if (typeof entry?.coverImage === "string" && entry.coverImage.trim()) {
            usedImages.add(entry.coverImage.trim());
          }
          if (typeof entry?.cover === "string" && entry.cover.trim()) {
            usedImages.add(entry.cover.trim());
          }
        }
      }
      if (Array.isArray(parsed?.publishedPosts)) {
        for (const post of parsed.publishedPosts) {
          if (typeof post?.coverImage === "string" && post.coverImage.trim()) {
            usedImages.add(post.coverImage.trim());
          }
        }
      }
    }
  } catch (err) {
    console.warn("[HistoryGuard] Could not read daemon state for cover images:", err);
  }

  // 3. Attempt to fetch remote context API (GET /api/content-context)
  try {
    const rawBase = (apiUrl || process.env.INXORA_API_URL || "http://localhost:3000").trim();
    let endpoint: string;

    if (rawBase.includes("/api/content-context")) {
      endpoint = rawBase;
    } else if (/\/api\/webhooks\/content-ingest\/?$/.test(rawBase)) {
      endpoint = rawBase.replace(/\/api\/webhooks\/content-ingest\/?$/, "/api/content-context");
    } else {
      endpoint = `${rawBase.replace(/\/+$/, "")}/api/content-context`;
    }

    const secretToken = process.env.CONTENT_INGEST_SECRET || "inxora-content-ingest-secret-2026-secure";
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${secretToken}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.usedCoverImages)) {
        for (const img of data.usedCoverImages) {
          if (typeof img === "string" && img.trim()) {
            usedImages.add(img.trim());
          }
        }
      }
      if (data && Array.isArray(data.existingPosts)) {
        for (const p of data.existingPosts) {
          if (typeof p?.coverImage === "string" && p.coverImage.trim()) {
            usedImages.add(p.coverImage.trim());
          }
        }
      }
      if (data && Array.isArray(data.posts)) {
        for (const p of data.posts) {
          if (typeof p?.coverImage === "string" && p.coverImage.trim()) {
            usedImages.add(p.coverImage.trim());
          }
        }
      }
    } else {
      console.warn(`[HistoryGuard] Remote API ${endpoint} returned HTTP ${res.status}. Proceeding with local history.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[HistoryGuard] Remote content-context API unreachable (${message}). Proceeding with local history.`);
  }

  return usedImages;
}

/**
 * Fetch recently published articles from the main Inxora feed or local cache.
 */
export async function fetchRecentArticles(
  feedUrl = "http://localhost:3000/feed.xml"
): Promise<ArticleHistoryItem[]> {
  const localHistory = loadLocalHistory();

  try {
    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const xml = await res.text();
      // Regex extraction for RSS items <title>, <link>, and <enclosure url="..." /> if present
      const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>(?:[\s\S]*?<enclosure[^>]*url="([^"]+)")?[\s\S]*?<\/item>/gi;
      const parsedItems: ArticleHistoryItem[] = [];
      let match;

      while ((match = itemRegex.exec(xml)) !== null && parsedItems.length < 15) {
        const title = match[1];
        const link = match[2];
        const coverImage = match[3];
        const slug = link.split("/").filter(Boolean).pop() || "";
        if (title && slug) {
          // Find matching local item to retain coverImage if not in enclosure
          const localMatch = localHistory.find((h) => h.slug === slug);
          parsedItems.push({
            title,
            slug,
            coverImage: coverImage || localMatch?.coverImage,
          });
        }
      }

      if (parsedItems.length > 0) {
        return parsedItems;
      }
    }
  } catch {
    // If remote feed is unavailable, smoothly fallback to local cache
  }

  return localHistory.slice(0, 15);
}

/**
 * Builds negative constraint instructions for LLMs to prevent keyword & narrative cannibalization.
 */
export function buildAntiCannibalizationPrompt(existingArticles: ArticleHistoryItem[]): string {
  if (existingArticles.length === 0) {
    return "";
  }

  const articleTitles = existingArticles
    .slice(0, 8)
    .map((a, i) => `  ${i + 1}. "${a.title}"`)
    .join("\n");

  return `
PENTING (ANTI-KANIBALISASI & KEUNIKAN KONTEN):
Artikel-artikel berikut SUDAH PERNAH terbit di website Inxora Studio:
${articleTitles}

ATURAN DEDUP MUTLAK:
- DILARANG menggunakan contoh studi kasus yang sama dengan artikel di atas.
- DILARANG mengulang analogi atau frasa pembuka yang mirip.
- Sajikan materi dengan sudut pandang pembeda (information gain) yang segar sehingga pembaca mendapatkan wawasan baru yang belum pernah dibahas sebelumnya.
`.trim();
}
