export interface GoogleSuggestion {
  query: string;
  intent: string;
}

export interface LiveArticleSignal {
  title: string;
  url: string;
  source: string;
  pubDate?: string;
}

export interface SerpIntelligenceResult {
  googleQueries: string[];
  trendingArticles: LiveArticleSignal[];
  hnDiscussions: Array<{ title: string; url: string; points: number }>;
  githubRepos: Array<{ name: string; url: string; stars: number; description: string }>;
  competitorOutlines?: Array<{
    sourceUrl: string;
    headings: string[];
  }>;
}

/**
 * Fetches real Google Autocomplete search queries in Indonesia.
 * Directly reflects what real users and business buyers type into Google.
 */
export async function fetchGoogleSearchSuggestions(query: string): Promise<string[]> {
  const tryQuery = async (q: string): Promise<string[]> => {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}&hl=id`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          return data[1].slice(0, 10).map((s: unknown) => String(s));
        }
      }
    } catch {
      // ignore
    }
    return [];
  };

  const results = await tryQuery(query);
  if (results.length > 0) return results;

  // Fallback to first 2 words if specific phrase has no direct completion
  const shortQuery = query.split(/\s+/).slice(0, 2).join(" ");
  if (shortQuery !== query) {
    return tryQuery(shortQuery);
  }

  return [];
}

/**
 * Fetches live indexed articles from Google News / RSS feed.
 */
export async function fetchGoogleLiveArticles(
  query: string,
  locale: "id" | "en" | "all" = "id"
): Promise<LiveArticleSignal[]> {
  const fetchForLang = async (langParam: string): Promise<LiveArticleSignal[]> => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${langParam}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Inxora-SEO/1.0" },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const xml = await res.text();
        const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?(?:<pubDate>(.*?)<\/pubDate>)?[\s\S]*?<\/item>/gi;
        const results: LiveArticleSignal[] = [];
        let match;

        while ((match = itemRegex.exec(xml)) !== null && results.length < 5) {
          const rawTitle = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/&amp;/g, "&");
          const parts = rawTitle.split(" - ");
          const title = parts[0].trim();
          const source = parts.length > 1 ? parts[parts.length - 1].trim() : "Google Indexed";
          const link = match[2];
          const pubDate = match[3];

          if (title && !title.toLowerCase().includes("lowongan kerja")) {
            results.push({ title, url: link, source, pubDate });
          }
        }
        return results;
      }
    } catch {
      // Graceful fallback
    }
    return [];
  };

  const idResults = await fetchForLang("hl=id&gl=ID&ceid=ID:id");
  if (idResults.length > 0 || locale === "id") return idResults;

  // Fallback to global tech news if Indonesian results are empty
  return fetchForLang("hl=en-US&gl=US&ceid=US:en");
}

/**
 * Fetches live technical news and trending community signals for TREND_NEWS topic discovery.
 */
export async function fetchTechTrendSignals(queries: string[]): Promise<{
  articles: LiveArticleSignal[];
  hnStories: Array<{ title: string; url: string; points: number }>;
  githubRepos: Array<{ name: string; url: string; stars: number; description: string }>;
}> {
  const articlePromises = queries.map((q) => fetchGoogleLiveArticles(q, "all"));
  const communityPromises = queries.map((q) => fetchCommunitySignals(q));

  const [articleLists, communityLists] = await Promise.all([
    Promise.all(articlePromises),
    Promise.all(communityPromises),
  ]);

  const articles: LiveArticleSignal[] = [];
  const seenUrls = new Set<string>();
  for (const list of articleLists) {
    for (const art of list) {
      if (!seenUrls.has(art.url)) {
        seenUrls.add(art.url);
        articles.push(art);
      }
    }
  }

  const hnStories: Array<{ title: string; url: string; points: number }> = [];
  const githubRepos: Array<{ name: string; url: string; stars: number; description: string }> = [];
  const seenHn = new Set<string>();
  const seenGh = new Set<string>();

  for (const comm of communityLists) {
    for (const s of comm.hnStories) {
      if (!seenHn.has(s.url)) {
        seenHn.add(s.url);
        hnStories.push(s);
      }
    }
    for (const r of comm.githubRepos) {
      if (!seenGh.has(r.url)) {
        seenGh.add(r.url);
        githubRepos.push(r);
      }
    }
  }

  return { articles, hnStories, githubRepos };
}

/**
 * Fetches technical community discussions and trending repos.
 */
export async function fetchCommunitySignals(query: string): Promise<{
  hnStories: Array<{ title: string; url: string; points: number }>;
  githubRepos: Array<{ name: string; url: string; stars: number; description: string }>;
}> {
  const primaryQuery = encodeURIComponent(query);

  const [hnRes, ghRes] = await Promise.allSettled([
    fetch(
      `https://hn.algolia.com/api/v1/search?query=${primaryQuery}&tags=story&hitsPerPage=4`,
      { signal: AbortSignal.timeout(4000) }
    ).then((r) => r.json()),
    fetch(
      `https://api.github.com/search/repositories?q=${primaryQuery}&sort=stars&order=desc&per_page=4`,
      {
        headers: { "User-Agent": "Inxora-SEO-Research-Agent/1.0" },
        signal: AbortSignal.timeout(4000),
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

/**
 * Reads clean markdown from an authoritative web URL via Jina Reader
 * to extract competitor heading structure and find information gaps.
 */
export async function fetchCompetitorHeadingOutline(url: string): Promise<string[]> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const text = await res.text();
      const lines = text.split("\n");
      const headings: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
          headings.push(trimmed.replace(/^#+\s*/, ""));
          if (headings.length >= 8) break;
        }
      }
      return headings;
    }
  } catch {
    // Fail silently without blocking pipeline
  }
  return [];
}

/**
 * Aggregates real-time live SERP & Web Intelligence.
 */
export async function gatherLiveSerpIntelligence(
  searchQuery: string
): Promise<SerpIntelligenceResult> {
  console.log(`    ↳ Querying live Google SERP signals for: "${searchQuery}"...`);

  const [googleQueries, trendingArticles, community] = await Promise.all([
    fetchGoogleSearchSuggestions(searchQuery),
    fetchGoogleLiveArticles(searchQuery),
    fetchCommunitySignals(searchQuery),
  ]);

  console.log(`    ↳ Extracted: ${googleQueries.length} Google search suggestions, ${trendingArticles.length} live articles.`);

  return {
    googleQueries,
    trendingArticles,
    hnDiscussions: community.hnStories,
    githubRepos: community.githubRepos,
  };
}
