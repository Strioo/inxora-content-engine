export interface AutoLinkRule {
  keyword: string;
  url: string;
  title?: string;
}

export interface PostCandidate {
  title: string;
  slug: string;
  tags?: string[];
  category?: string;
}

const SKIP_TAGS = new Set([
  "a",
  "pre",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "button",
  "script",
  "style",
]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds Wikipedia-style internal linking rules from existing published posts.
 */
export function buildInternalLinkRules(
  posts: PostCandidate[],
  currentSlug?: string
): AutoLinkRule[] {
  const eligiblePosts = posts.filter(
    (post) => Boolean(post.slug?.trim()) && post.slug.trim() !== currentSlug?.trim()
  );

  const ruleMap = new Map<string, { rule: AutoLinkRule; priority: number }>();

  for (const post of eligiblePosts) {
    const postUrl = `/blog/post/${post.slug.trim()}`;
    const cleanTitle = post.title?.trim() ?? "";

    const candidateKeywords: Array<{ text: string; basePriority: number }> = [];

    // 1. Full title (highest specificity)
    if (cleanTitle.length >= 4) {
      candidateKeywords.push({ text: cleanTitle, basePriority: 100 });
    }

    // 2. Main clause before delimiter
    const splitMatch = cleanTitle.split(/[:–—\-]/);
    if (splitMatch.length > 1) {
      const mainClause = splitMatch[0].trim();
      if (mainClause.length >= 4 && mainClause !== cleanTitle) {
        candidateKeywords.push({ text: mainClause, basePriority: 80 });
      }
    }

    // 3. Post tags
    if (Array.isArray(post.tags)) {
      for (const rawTag of post.tags) {
        const tag = typeof rawTag === "string" ? rawTag.trim() : "";
        if (tag.length >= 3) {
          const inTitle = cleanTitle.toLowerCase().includes(tag.toLowerCase());
          candidateKeywords.push({
            text: tag,
            basePriority: inTitle ? 70 : 50,
          });
        }
      }
    }

    for (const { text, basePriority } of candidateKeywords) {
      const normalizedKey = text.toLowerCase();
      const existing = ruleMap.get(normalizedKey);

      if (!existing || basePriority > existing.priority) {
        ruleMap.set(normalizedKey, {
          priority: basePriority,
          rule: {
            keyword: text,
            url: postUrl,
            title: `Baca artikel: ${cleanTitle}`,
          },
        });
      }
    }
  }

  // Sort rules by keyword length descending (longer phrases match first)
  return Array.from(ruleMap.values())
    .map((entry) => entry.rule)
    .sort((a, b) => b.keyword.length - a.keyword.length);
}

/**
 * Pre-computes and injects Wikipedia-style contextual internal links into HTML content.
 */
export function precomputeInternalLinks(
  html: string,
  existingPosts: PostCandidate[],
  currentSlug?: string
): { html: string; linkedCount: number } {
  if (!html || !existingPosts || existingPosts.length === 0) {
    return { html, linkedCount: 0 };
  }

  const rules = buildInternalLinkRules(existingPosts, currentSlug);
  if (rules.length === 0) {
    return { html, linkedCount: 0 };
  }

  const linkedUrls = new Set<string>();
  const linkedKeywords = new Set<string>();
  let linkedCount = 0;

  // Split HTML into tags and text chunks
  const tagRegex = /<[^>]+>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  type Segment = { type: "tag" | "text"; content: string; tagName?: string; isClosing?: boolean };
  const segments: Segment[] = [];

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: html.slice(lastIndex, match.index),
      });
    }

    const tagStr = match[0];
    const isClosing = tagStr.startsWith("</");
    const nameMatch = tagStr.match(/<\/?([a-zA-Z0-9]+)/);
    const tagName = nameMatch ? nameMatch[1].toLowerCase() : "";

    segments.push({
      type: "tag",
      content: tagStr,
      tagName,
      isClosing,
    });

    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < html.length) {
    segments.push({
      type: "text",
      content: html.slice(lastIndex),
    });
  }

  // Track active nesting tags
  const activeTags: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.type === "tag") {
      const tag = seg.tagName || "";
      if (seg.isClosing) {
        const lastIdx = activeTags.lastIndexOf(tag);
        if (lastIdx !== -1) {
          activeTags.splice(lastIdx, 1);
        }
      } else if (!seg.content.endsWith("/>")) {
        activeTags.push(tag);
      }
      continue;
    }

    // Inside text node: check if inside any skip tags (like <a>, <pre>, <code>, headings)
    const insideSkipTag = activeTags.some((t) => SKIP_TAGS.has(t));
    if (insideSkipTag) {
      continue;
    }

    let textContent = seg.content;

    for (const rule of rules) {
      const normKw = rule.keyword.toLowerCase();
      if (linkedUrls.has(rule.url) || linkedKeywords.has(normKw)) {
        continue;
      }

      // Max 5 internal links per article to maintain high quality and prevent spamminess
      if (linkedCount >= 5) {
        break;
      }

      const escaped = escapeRegExp(rule.keyword);
      const kwRegex = new RegExp(`(?<=^|[\\s.,!?;:("'\\[])(${escaped})(?=$|[\\s.,!?;:)"'\\]])`, "i");

      const kwMatch = kwRegex.exec(textContent);
      if (kwMatch && kwMatch.index !== undefined) {
        const matchedText = kwMatch[1];
        const matchIdx = kwMatch.index;

        const anchorTag = `<a href="${rule.url}" class="font-medium text-primary hover:underline underline-offset-4" title="${rule.title || matchedText}" data-internal-link="true">${matchedText}</a>`;

        textContent =
          textContent.slice(0, matchIdx) +
          anchorTag +
          textContent.slice(matchIdx + matchedText.length);

        linkedUrls.add(rule.url);
        linkedKeywords.add(normKw);
        linkedCount++;
        break;
      }
    }

    seg.content = textContent;
  }

  return {
    html: segments.map((s) => s.content).join(""),
    linkedCount,
  };
}

