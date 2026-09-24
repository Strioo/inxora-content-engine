import fs from "fs";
import path from "path";

export interface ArticleHistoryItem {
  title: string;
  slug: string;
  category?: string;
  publishedAt?: string;
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
    // Keep last 30 articles in cache
    fs.writeFileSync(LOCAL_HISTORY_FILE, JSON.stringify(filtered.slice(0, 30), null, 2), "utf-8");
  } catch (err) {
    console.warn("[HistoryGuard] Could not record article in history cache:", err);
  }
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
      // Simple regex extraction for RSS items <title> and <link>
      const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/gi;
      const parsedItems: ArticleHistoryItem[] = [];
      let match;

      while ((match = itemRegex.exec(xml)) !== null && parsedItems.length < 8) {
        const title = match[1];
        const link = match[2];
        const slug = link.split("/").filter(Boolean).pop() || "";
        if (title && slug) {
          parsedItems.push({ title, slug });
        }
      }

      if (parsedItems.length > 0) {
        return parsedItems;
      }
    }
  } catch {
    // If remote feed is unavailable, smoothly fallback to local cache
  }

  return localHistory.slice(0, 8);
}

/**
 * Builds negative constraint instructions for LLMs to prevent keyword & narrative cannibalization.
 */
export function buildAntiCannibalizationPrompt(existingArticles: ArticleHistoryItem[]): string {
  if (existingArticles.length === 0) {
    return "";
  }

  const articleTitles = existingArticles
    .slice(0, 5)
    .map((a, i) => `  ${i + 1}. "${a.title}"`)
    .join("\n");

  return `
PENTING (ANTI-KANIBALISASI & KEUNIKAN KONTEN):
Artikel-artikel teknis berikut SUDAH PERNAH terbit di website Inxora Studio:
${articleTitles}

ATURAN DEDUP MUTLAK:
- DILARANG menggunakan contoh studi kasus yang sama dengan artikel di atas.
- DILARANG mengulang analogi atau frasa pembuka yang mirip.
- Sajikan materi dengan sudut pandang pembeda (information gain) yang segar sehingga pembaca mendapatkan wawasan baru yang belum pernah dibahas sebelumnya.
`.trim();
}

