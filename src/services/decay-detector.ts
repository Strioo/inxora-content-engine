import fs from "fs";
import path from "path";
import { fetchInxoraKnowledgeContext, InxoraKnowledgeContext, InxoraPostContext } from "./context-fetcher.js";

export interface ArticleDecayIssue {
  type: "OUTDATED_YEAR" | "BROKEN_LINK" | "THIN_CONTENT" | "AGE_DECAY" | "MISSING_FAQ";
  severity: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  evidence?: string;
  recommendedAction: string;
}

export interface ArticleDecayAudit {
  title: string;
  slug: string;
  url: string;
  publishedAt?: string;
  daysSincePublished?: number;
  wordCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  issues: ArticleDecayIssue[];
  decayRisk: "HEALTHY" | "MODERATE" | "CRITICAL";
}

export interface DecayReport {
  timestamp: string;
  totalArticlesAudited: number;
  criticalDecayCount: number;
  moderateDecayCount: number;
  healthyCount: number;
  articles: ArticleDecayAudit[];
}

const REPORT_FILE_PATH = path.resolve(process.cwd(), "data/decay-audit-report.json");

function getBaseUrl(): string {
  const envUrl = process.env.INXORA_API_URL?.trim() || "";
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      // ignore
    }
  }
  return "http://localhost:3000";
}

/**
 * Checks if a given URL is reachable with realistic browser headers and short timeout.
 */
async function pingUrl(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const cleanUrl = url.replace(/&amp;/g, "&");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    const res = await fetch(cleanUrl, {
      method: "HEAD",
      headers,
      signal: controller.signal,
    }).catch(async () => {
      // Fallback to GET with small byte range if HEAD is unsupported
      return fetch(cleanUrl, {
        method: "GET",
        headers: { ...headers, Range: "bytes=0-100" },
        signal: controller.signal,
      });
    });

    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Strips broken anchor tags from HTML while preserving their inner anchor text.
 */
export function autoPatchBrokenLinks(
  html: string,
  brokenUrls: string[]
): { patchedHtml: string; patchedCount: number } {
  let patchedHtml = html;
  let patchedCount = 0;

  const validUrls = Array.from(
    new Set(
      brokenUrls
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
        .map((u) => u.trim())
    )
  );

  for (const url of validUrls) {
    const variants = new Set<string>([url]);
    if (url.includes("&")) {
      variants.add(url.replace(/&/g, "&amp;"));
    }
    if (url.includes("&amp;")) {
      variants.add(url.replace(/&amp;/g, "&"));
    }

    for (const targetUrl of variants) {
      const escaped = targetUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`<a\\b[^>]*?\\bhref=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/a>`, "gi");
      const matches = patchedHtml.match(regex);
      if (matches && matches.length > 0) {
        patchedCount += matches.length;
        patchedHtml = patchedHtml.replace(regex, "$1");
      }
    }
  }

  return { patchedHtml, patchedCount };
}

export interface AuditOptions {
  autoFix?: boolean;
}

/**
 * Scans an article HTML content for broken links, outdated year signals, thin content, and missing FAQ.
 */
export async function auditArticleDecay(
  post: InxoraPostContext,
  context: InxoraKnowledgeContext,
  baseUrl: string,
  options: AuditOptions | boolean = false
): Promise<ArticleDecayAudit> {
  const autoFix = typeof options === "boolean" ? options : Boolean(options?.autoFix);
  const issues: ArticleDecayIssue[] = [];
  const articleUrl = `${baseUrl}${post.path}`;

  let calculatedWordCount = 0;
  let internalLinksCount = 0;
  let externalLinksCount = 0;

  // 1. Fetch published HTML
  try {
    const res = await fetch(articleUrl, {
      signal: AbortSignal.timeout(4500),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      issues.push({
        type: "BROKEN_LINK",
        severity: "HIGH",
        description: `Halaman artikel mengembalikan HTTP ${res.status}.`,
        evidence: `URL: ${articleUrl}`,
        recommendedAction: "Periksa status publikasi artikel di database.",
      });
    } else {
      const html = await res.text();

      // Extract article body content
      const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
      const articleHtml = articleMatch ? articleMatch[0] : html;

      // Calculate actual word count (strip HTML tags, scripts, styles)
      const cleanText = articleHtml
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      calculatedWordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;

      if (calculatedWordCount < 500) {
        issues.push({
          type: "THIN_CONTENT",
          severity: "MEDIUM",
          description: `Artikel tergolong tipis (hanya ${calculatedWordCount} kata). Idealnya minimal 1.000 kata untuk SEO otoritas.`,
          evidence: `Word Count: ${calculatedWordCount}`,
          recommendedAction: "Perkaya konten dengan studi kasus, data implementasi, atau panduan teknis mendalam.",
        });
      }

      // Check FAQ Accordion presence
      const hasFaqSection =
        html.includes("Frequently Asked Questions") ||
        html.includes('"@type":"FAQPage"') ||
        html.includes('"@type": "FAQPage"');

      if (!hasFaqSection) {
        issues.push({
          type: "MISSING_FAQ",
          severity: "LOW",
          description: "Artikel belum dilengkapi FAQ Schema JSON-LD dan UI accordion.",
          recommendedAction: "Tambahkan minimal 3 pasang Q&A relevan untuk merebut Google Rich Snippets.",
        });
      }

      // Extract and verify hyperlinks
      const linkRegex = /href=["']([^"']+)["']/gi;
      const internalLinks: string[] = [];
      const externalLinks: string[] = [];

      let match;
      while ((match = linkRegex.exec(articleHtml)) !== null) {
        const href = match[1].trim();
        if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
          continue;
        }

        if (href.startsWith("/")) {
          internalLinks.push(href);
        } else if (href.startsWith("http://") || href.startsWith("https://")) {
          externalLinks.push(href);
        }
      }

      internalLinksCount = internalLinks.length;
      externalLinksCount = externalLinks.length;

      const brokenUrls: string[] = [];
      const brokenLinkIssues: ArticleDecayIssue[] = [];

      // Verify internal links
      const checkedInternal = new Set<string>();
      for (const link of internalLinks.slice(0, 10)) {
        const cleanPath = link.split("?")[0].split("#")[0];
        if (checkedInternal.has(cleanPath) || cleanPath === "/" || cleanPath === "/blog") continue;
        checkedInternal.add(cleanPath);

        // If not in known context whitelist, verify with HTTP HEAD
        if (!context.validInternalUrls.includes(cleanPath)) {
          const pingResult = await pingUrl(`${baseUrl}${cleanPath}`);
          if (!pingResult.ok && pingResult.status === 404) {
            brokenUrls.push(link);
            brokenLinkIssues.push({
              type: "BROKEN_LINK",
              severity: "HIGH",
              description: `Ditemukan tautan internal rusak (404 Not Found): ${cleanPath}`,
              evidence: `Broken target: ${cleanPath}`,
              recommendedAction: "Perbaiki tautan internal atau buat 301 redirect di dashboard admin.",
            });
          }
        }
      }

      // Sample check external links (up to 2 external links)
      const checkedExternal = new Set<string>();
      for (const extLink of externalLinks.slice(0, 2)) {
        const cleanUrl = extLink.replace(/&amp;/g, "&");
        if (checkedExternal.has(cleanUrl)) continue;
        checkedExternal.add(cleanUrl);

        // Filter out anti-bot responses (401/403/429) from platforms like Unsplash or Cloudflare
        const extPing = await pingUrl(cleanUrl);
        if (!extPing.ok && (extPing.status === 404 || extPing.status === 410)) {
          brokenUrls.push(extLink);
          brokenLinkIssues.push({
            type: "BROKEN_LINK",
            severity: "HIGH",
            description: `Tautan eksternal tidak ditemukan (HTTP ${extPing.status}): ${cleanUrl}`,
            evidence: `Target: ${cleanUrl}`,
            recommendedAction: "Ganti referensi sumber eksternal dengan URL alternatif yang aktif.",
          });
        }
      }

      // Auto-fix handling
      if (autoFix) {
        if (brokenUrls.length > 0) {
          const { patchedHtml, patchedCount } = autoPatchBrokenLinks(articleHtml, brokenUrls);
          if (patchedCount > 0) {
            const secretToken = process.env.CONTENT_INGEST_SECRET || "inxora-content-ingest-secret-2026-secure";
            const patchUrl = `${baseUrl.replace(/\/+$/, "")}/api/webhooks/content-patch`;

            try {
              const patchRes = await fetch(patchUrl, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${secretToken}`,
                },
                body: JSON.stringify({
                  slug: post.slug,
                  content: patchedHtml,
                  reason: "DecayDetector: unlinked 404 dead links",
                }),
              });

              if (patchRes.ok) {
                console.log(`[Decay Auto-Patcher] Successfully unlinked ${patchedCount} broken link(s) in "${post.title}".`);
              } else {
                console.error(`[Decay Auto-Patcher] Failed to patch "${post.title}": HTTP ${patchRes.status}`);
                issues.push(...brokenLinkIssues);
              }
            } catch (patchErr) {
              console.error(`[Decay Auto-Patcher] Error dispatching patch for "${post.title}":`, patchErr);
              issues.push(...brokenLinkIssues);
            }
          } else {
            issues.push(...brokenLinkIssues);
          }
        }
      } else {
        issues.push(...brokenLinkIssues);
      }
    }
  } catch (fetchErr) {
    issues.push({
      type: "BROKEN_LINK",
      severity: "HIGH",
      description: `Gagal mengakses artikel saat audit: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
      evidence: `URL: ${articleUrl}`,
      recommendedAction: "Pastikan web server lokal/produksi aktif melayani permintaan.",
    });
  }

  // 2. Year Obsolescence Check in Title (2020-2025)
  const currentYear = new Date().getFullYear();
  const pastYears = [2020, 2021, 2022, 2023, 2024, 2025];
  for (const year of pastYears) {
    if (post.title.includes(String(year))) {
      issues.push({
        type: "OUTDATED_YEAR",
        severity: "HIGH",
        description: `Judul artikel masih menyertakan tahun usang (${year}).`,
        evidence: `Title: "${post.title}"`,
        recommendedAction: `Perbarui judul ke ${currentYear} atau gunakan formula evergreen.`,
      });
    }
  }

  // Determine Decay Risk Level accurately
  let decayRisk: ArticleDecayAudit["decayRisk"] = "HEALTHY";
  const hasHighSeverity = issues.some((i) => i.severity === "HIGH");
  const hasMediumSeverity = issues.some((i) => i.severity === "MEDIUM");

  if (hasHighSeverity) {
    decayRisk = "CRITICAL";
  } else if (hasMediumSeverity || issues.length >= 2) {
    decayRisk = "MODERATE";
  }

  return {
    title: post.title,
    slug: post.slug,
    url: post.path,
    wordCount: calculatedWordCount,
    internalLinksCount,
    externalLinksCount,
    issues,
    decayRisk,
  };
}

export const auditArticleContent = auditArticleDecay;

/**
 * Runs complete content decay and link freshness audit across all published articles.
 */
export async function runDecayAudit(options: AuditOptions = {}): Promise<DecayReport> {
  const isCliAutoFix = process.argv.includes("--auto-fix") || process.argv.includes("--fix");
  const autoFix = options.autoFix !== undefined ? options.autoFix : isCliAutoFix;

  console.log(`\n=========================================================`);
  console.log(`🛡️ Starting Deep Content Decay & True Link Health Audit Engine`);
  if (autoFix) {
    console.log(`🔧 Auto-Fix Mode       : ENABLED (Unlinking 404 dead links)`);
  }
  console.log(`=========================================================`);

  const baseUrl = getBaseUrl();
  console.log(`✓ Target Web Endpoint  : ${baseUrl}`);

  const context = await fetchInxoraKnowledgeContext();
  const posts = context.existingPosts || [];

  console.log(`✓ Auditing ${posts.length} published articles with true link ping...`);

  const audits: ArticleDecayAudit[] = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    process.stdout.write(`   [${i + 1}/${posts.length}] Checking: "${post.title.slice(0, 45)}..." `);
    const audit = await auditArticleDecay(post, context, baseUrl, { autoFix });
    audits.push(audit);
    console.log(audit.decayRisk === "HEALTHY" ? "✅ HEALTHY" : audit.decayRisk === "MODERATE" ? "⚠️ MODERATE" : "🚨 CRITICAL");
  }

  const criticalCount = audits.filter((a) => a.decayRisk === "CRITICAL").length;
  const moderateCount = audits.filter((a) => a.decayRisk === "MODERATE").length;
  const healthyCount = audits.filter((a) => a.decayRisk === "HEALTHY").length;

  const report: DecayReport = {
    timestamp: new Date().toISOString(),
    totalArticlesAudited: audits.length,
    criticalDecayCount: criticalCount,
    moderateDecayCount: moderateCount,
    healthyCount: healthyCount,
    articles: audits,
  };

  const dir = path.dirname(REPORT_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REPORT_FILE_PATH, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n📊 DEEP DECAY AUDIT RESULTS:`);
  console.log(`   - Total Audited     : ${audits.length}`);
  console.log(`   - Healthy Articles  : ${healthyCount} ✅`);
  console.log(`   - Moderate Risk     : ${moderateCount} ⚠️`);
  console.log(`   - Critical Decay    : ${criticalCount} 🚨`);
  console.log(`✓ Audit report saved to : ${REPORT_FILE_PATH}`);
  console.log(`=========================================================\n`);

  return report;
}

export const runContentDecayAudit = runDecayAudit;

if (process.argv[1]?.endsWith("decay-detector.ts")) {
  const isAutoFix = process.argv.includes("--auto-fix") || process.argv.includes("--fix");
  runDecayAudit({ autoFix: isAutoFix }).catch((err) => {
    console.error("❌ Decay audit failed:", err);
    process.exit(1);
  });
}

