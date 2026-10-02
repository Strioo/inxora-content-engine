import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  loadBacklog,
  discoverTopics,
  getNextBacklogTopic,
  markBacklogTopicStatus,
} from "./services/topic-discovery.js";
import { fetchInxoraKnowledgeContext } from "./services/context-fetcher.js";
import { researchTopic, ResearchOptions } from "./services/researcher.js";
import { resolveArticleVisualPackage } from "./services/image-generator.js";
import { generateArticle } from "./services/writer.js";
import { publishArticle, IngestPayload, broadcastPublishedNewsletter } from "./services/publisher.js";
import { recordArticleInHistory, getAllUsedCoverImages } from "./services/history-guard.js";
import { precomputeInternalLinks } from "./services/autolinker.js";
import { repurposeForSocial } from "./services/social-repurposer.js";
import { dispatchTeamNotification } from "./services/notifier.js";
import { INXORA_AUTHOR, TopicResearchMode, DAEMON_PUBLISH_STATUS } from "./config.js";

export interface DaemonState {
  lastRunTimestamp: number;
  lastRunDate: string;
  lastCategoryMode: "TREND_NEWS" | "GENERAL_EVERGREEN";
  publishedThisWeek: number;
  weekStartDate: string;
  history: Array<{
    timestamp: number;
    title: string;
    categoryMode: string;
    publishStatus?: "DRAFT" | "PUBLISHED";
  }>;
}

export interface DaemonOptions {
  once: boolean;
  force: boolean;
  intervalDays: number;
  weeklyLimit: number;
  mode?: TopicResearchMode;
  publishStatus?: "DRAFT" | "PUBLISHED";
}

const STATE_FILE_PATH = path.resolve(process.cwd(), "data/daemon-state.json");

export function getStartOfWeekISO(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  // In ISO 8601, Monday is the start of the week.
  // getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function loadDaemonState(): DaemonState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DaemonState>;
      return {
        lastRunTimestamp: typeof parsed.lastRunTimestamp === "number" ? parsed.lastRunTimestamp : 0,
        lastRunDate: parsed.lastRunDate || "",
        lastCategoryMode: parsed.lastCategoryMode === "TREND_NEWS" ? "TREND_NEWS" : "GENERAL_EVERGREEN",
        publishedThisWeek: typeof parsed.publishedThisWeek === "number" ? parsed.publishedThisWeek : 0,
        weekStartDate: parsed.weekStartDate || getStartOfWeekISO(),
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    }
  } catch (err) {
    console.warn("⚠️ Failed to load daemon state, initializing defaults:", err);
  }

  return {
    lastRunTimestamp: 0,
    lastRunDate: "",
    lastCategoryMode: "GENERAL_EVERGREEN",
    publishedThisWeek: 0,
    weekStartDate: getStartOfWeekISO(),
    history: [],
  };
}

export function saveDaemonState(state: DaemonState): void {
  const dir = path.dirname(STATE_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${STATE_FILE_PATH}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmpPath, STATE_FILE_PATH);
}

export function parseDaemonArgs(): DaemonOptions {
  const args = process.argv.slice(2);
  const defaultIntervalDays = parseFloat(
    process.env.DAEMON_INTERVAL_DAYS ||
      (process.env.DAEMON_INTERVAL_HOURS
        ? String(parseFloat(process.env.DAEMON_INTERVAL_HOURS) / 24)
        : "3")
  );
  const defaultWeeklyLimit = parseInt(process.env.DAEMON_WEEKLY_LIMIT || "3", 10);

  const options: DaemonOptions = {
    once: false,
    force: false,
    intervalDays: isNaN(defaultIntervalDays) ? 3 : defaultIntervalDays,
    weeklyLimit: isNaN(defaultWeeklyLimit) ? 3 : defaultWeeklyLimit,
    publishStatus: DAEMON_PUBLISH_STATUS,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--once") {
      options.once = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--draft") {
      options.publishStatus = "DRAFT";
    } else if (arg === "--publish") {
      options.publishStatus = "PUBLISHED";
    } else if (arg.startsWith("--publish-status=")) {
      const val = arg.slice(17).toUpperCase();
      if (val === "DRAFT" || val === "PUBLISHED") {
        options.publishStatus = val;
      }
    } else if (arg === "--publish-status" && args[i + 1]) {
      const val = args[++i].toUpperCase();
      if (val === "DRAFT" || val === "PUBLISHED") {
        options.publishStatus = val;
      }
    } else if (arg.startsWith("--interval-days=")) {
      options.intervalDays = parseFloat(arg.slice(16));
    } else if (arg === "--interval-days" && args[i + 1]) {
      options.intervalDays = parseFloat(args[++i]);
    } else if (arg.startsWith("--interval-hours=")) {
      options.intervalDays = parseFloat(arg.slice(17)) / 24;
    } else if (arg === "--interval-hours" && args[i + 1]) {
      options.intervalDays = parseFloat(args[++i]) / 24;
    } else if (arg.startsWith("--weekly-limit=")) {
      options.weeklyLimit = parseInt(arg.slice(15), 10);
    } else if (arg === "--weekly-limit" && args[i + 1]) {
      options.weeklyLimit = parseInt(args[++i], 10);
    } else if (arg.startsWith("--mode=")) {
      const m = arg.slice(7).toUpperCase();
      if (m === "TREND_NEWS" || m === "GENERAL_EVERGREEN") {
        options.mode = m;
      }
    } else if (arg === "--mode" && args[i + 1]) {
      const m = args[++i].toUpperCase();
      if (m === "TREND_NEWS" || m === "GENERAL_EVERGREEN") {
        options.mode = m;
      }
    }
  }

  return options;
}

export async function runAutonomousCycle(options?: Partial<DaemonOptions>): Promise<boolean> {
  const mergedOptions: DaemonOptions = {
    ...parseDaemonArgs(),
    ...options,
  };

  console.log(`\n=========================================================`);
  console.log(`⏰ [Daemon Runner] Starting Autonomous Organic Publishing Cycle`);
  console.log(`   Timestamp: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`);
  console.log(`=========================================================`);

  // 1. Load and evaluate persistent rate-limiting state
  const state = loadDaemonState();
  const currentWeekStart = getStartOfWeekISO();

  // Reset weekly quota if we entered a new calendar week
  if (state.weekStartDate !== currentWeekStart) {
    console.log(`📅 [Daemon Rate-Limiter] New calendar week detected (starting ${currentWeekStart}). Resetting weekly publishing counter.`);
    state.publishedThisWeek = 0;
    state.weekStartDate = currentWeekStart;
    saveDaemonState(state);
  }

  // Check weekly limit
  if (!mergedOptions.force && state.publishedThisWeek >= mergedOptions.weeklyLimit) {
    console.log(`🛑 [Daemon Rate-Limiter] Weekly quota reached: ${state.publishedThisWeek}/${mergedOptions.weeklyLimit} articles published this week (Week of ${state.weekStartDate}).`);
    console.log(`   Next publishing quota window opens next Monday. Cleanly skipping cycle.`);
    return false;
  }

  // Check interval elapsed
  const now = Date.now();
  const intervalMs = mergedOptions.intervalDays * 24 * 60 * 60 * 1000;
  const elapsedMs = now - state.lastRunTimestamp;

  if (!mergedOptions.force && state.lastRunTimestamp > 0 && elapsedMs < intervalMs) {
    const remainingMs = intervalMs - elapsedMs;
    const remainingHours = (remainingMs / (1000 * 60 * 60)).toFixed(1);
    const remainingDays = (remainingMs / (1000 * 60 * 60 * 24)).toFixed(2);
    console.log(`⏳ [Daemon Rate-Limiter] Rate limit active. Required interval: ${mergedOptions.intervalDays} day(s).`);
    console.log(`   Last published: ${state.lastRunDate} (${(elapsedMs / (1000 * 3600)).toFixed(1)}h ago)`);
    console.log(`   Time remaining until next allowed run: ~${remainingHours} hour(s) (~${remainingDays} days). Cleanly skipping cycle.`);
    return false;
  }

  // 2. Rotate category mode
  const targetCategoryMode: TopicResearchMode = mergedOptions.mode
    ? mergedOptions.mode
    : state.lastCategoryMode === "TREND_NEWS"
    ? "GENERAL_EVERGREEN"
    : "TREND_NEWS";

  console.log(`🎯 [Daemon] Active Category Mode: [${targetCategoryMode}] (Alternated from [${state.lastCategoryMode}])`);

  // 3. Backlog Topic Selection / Discovery
  let nextTopic = await getNextBacklogTopic(targetCategoryMode);
  if (!nextTopic) {
    console.log(`[Daemon] No queued topic found for category [${targetCategoryMode}]. Triggering automated topic discovery...`);
    await discoverTopics(10, targetCategoryMode);
    nextTopic = await getNextBacklogTopic(targetCategoryMode);
  }

  // Fallback to any queued topic if still empty
  if (!nextTopic) {
    console.log(`[Daemon] No topic found for [${targetCategoryMode}], falling back to any available backlog topic...`);
    nextTopic = await getNextBacklogTopic();
  }

  if (!nextTopic) {
    console.warn(`[Daemon] ⚠️ No topics available to process in this cycle.`);
    return false;
  }

  console.log(`[Daemon] Picked Next Topic from Backlog:`);
  console.log(`   - Title         : "${nextTopic.topic}"`);
  console.log(`   - Research Mode : [${nextTopic.researchMode || targetCategoryMode}]`);
  console.log(`   - Category      : ${nextTopic.category}`);
  console.log(`   - Archetype     : ${nextTopic.archetype}`);
  console.log(`   - Industry      : ${nextTopic.industry}`);
  console.log(`   - Priority      : [${nextTopic.priority}]`);

  markBacklogTopicStatus(nextTopic.id, "IN_PROGRESS");

  try {
    // 4. Dynamic Inxora Knowledge Graph
    const knowledgeContext = await fetchInxoraKnowledgeContext();

    // 5. Deep Research & SERP Intelligence
    const researchOptions: ResearchOptions = {
      category: nextTopic.category,
      archetype: nextTopic.archetype,
      industry: nextTopic.industry,
      context: knowledgeContext,
    };
    const research = await researchTopic(nextTopic.topic, researchOptions);

    // 6. Multi-Image Visual Package with Dedup Guard
    const usedImages = await getAllUsedCoverImages(process.env.INXORA_API_URL);
    for (const art of research.existingArticles) {
      if (art.coverImage) usedImages.add(art.coverImage);
    }
    const visualPackage = await resolveArticleVisualPackage(
      nextTopic.topic,
      research.category,
      research.dossier?.visualKeywords || [],
      usedImages
    );

    // 7. Multi-Agent Orchestra Generation Loop
    const article = await generateArticle(research, visualPackage);

    // Pre-Compute Wikipedia-Style Internal Linking
    const { html: linkedContent, linkedCount } = precomputeInternalLinks(
      article.content,
      knowledgeContext.existingPosts
    );
    if (linkedCount > 0) {
      console.log(`[Daemon] Injected ${linkedCount} internal article links directly into HTML payload`);
    }

    // 8. Ingestion & Publishing
    const publishStatus: "DRAFT" | "PUBLISHED" = mergedOptions.publishStatus || "PUBLISHED";
    const payload: IngestPayload = {
      title: article.title,
      excerpt: article.excerpt,
      content: linkedContent,
      coverImage: visualPackage.cover.coverUrl,
      imageAttribution: visualPackage.cover.attribution,
      category: article.category,
      tags: article.tags,
      authorSlug: INXORA_AUTHOR.slug,
      status: publishStatus,
      metaTitle: article.metaTitle,
      metaDesc: article.metaDesc,
      faqItems: article.faqItems,
      metadata: article.metadata,
    };

    const publishResult = await publishArticle(payload);
    if (!publishResult.success || !publishResult.post) {
      throw new Error(publishResult.message || publishResult.error || "Publication failed");
    }

    markBacklogTopicStatus(nextTopic.id, "PUBLISHED", publishResult.post.url);

    // Record local history
    recordArticleInHistory({
      title: publishResult.post.title,
      slug: publishResult.post.slug,
      category: publishResult.post.category,
      coverImage: visualPackage.cover.coverUrl,
      publishedAt: new Date().toISOString(),
    });

    const siteBaseUrl = (process.env.SITE_PUBLIC_URL || "https://inxora.studio").replace(/\/$/, "");
    const publicUrl = `${siteBaseUrl}${publishResult.post.url}`;
    const adminEditUrl = `${siteBaseUrl}/admin/blog/${publishResult.post.id}`;

    // 9. Omnichannel Social Content Repurposing
    const socialPackage = await repurposeForSocial(article, publicUrl);

    // Broadcast published newsletter if status === "PUBLISHED"
    if (publishStatus === "PUBLISHED") {
      await broadcastPublishedNewsletter({
        title: publishResult.post.title,
        excerpt: article.excerpt,
        slug: publishResult.post.slug,
        coverImage: visualPackage.cover.coverUrl,
        contentHtml: linkedContent,
        postUrl: publicUrl,
      });
    } else {
      console.log(`[Daemon] Article saved as DRAFT in Inxora for editorial review.`);
    }

    // 10. Instant Team Notifications (Telegram & Discord)
    await dispatchTeamNotification({
      title: publishResult.post.title,
      slug: publishResult.post.slug,
      excerpt: article.excerpt,
      category: article.category,
      qualityScore: article.finalScore || 90,
      coverImageUrl: visualPackage.cover.coverUrl,
      coverAttribution: `Foto oleh ${visualPackage.cover.attribution.author} (${visualPackage.cover.attribution.source})`,
      publicUrl,
      adminEditUrl,
      faqCount: article.faqItems?.length || 0,
      socialSnippets: {
        linkedIn: socialPackage.linkedIn,
        twitter: socialPackage.twitterThread[0],
        newsletter: socialPackage.newsletterBlurb,
      },
    });

    // 11. Update Persistent Daemon State
    state.lastRunTimestamp = Date.now();
    state.lastRunDate = new Date().toISOString();
    state.lastCategoryMode = targetCategoryMode;
    state.publishedThisWeek += 1;
    state.history.unshift({
      timestamp: state.lastRunTimestamp,
      title: publishResult.post.title,
      categoryMode: targetCategoryMode,
      publishStatus,
    });
    if (state.history.length > 50) {
      state.history = state.history.slice(0, 50);
    }
    saveDaemonState(state);

    console.log(`\n🎉 [Daemon Runner] Cycle completed successfully for "${publishResult.post.title}"!`);
    console.log(`📊 [Daemon State] Published this week: ${state.publishedThisWeek}/${mergedOptions.weeklyLimit} | Category Mode: ${state.lastCategoryMode} | Status: ${publishStatus}`);
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ [Daemon Runner] Execution error on topic "${nextTopic.topic}":`, err);
    markBacklogTopicStatus(nextTopic.id, "FAILED", errorMsg);
    return false;
  }
}

async function main() {
  const options = parseDaemonArgs();

  // Register graceful shutdown handlers
  process.on("SIGTERM", () => {
    console.log("\n🛑 [Daemon Runner] Received SIGTERM signal. Exiting gracefully...");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("\n🛑 [Daemon Runner] Received SIGINT signal (Ctrl+C). Exiting gracefully...");
    process.exit(0);
  });

  console.log("=========================================================");
  console.log("🤖 Inxora Content Engine Autonomous Daemon Runner Active");
  console.log(`   Mode          : ${options.once ? "One-shot execution (--once)" : "Continuous Scheduled Loop"}`);
  console.log(`   Interval      : ${options.intervalDays} day(s)`);
  console.log(`   Weekly Quota  : ${options.weeklyLimit} article(s)/week`);
  if (options.mode) {
    console.log(`   Mode Lock     : ${options.mode}`);
  }
  if (options.force) {
    console.log(`   Force Option  : ENABLED (bypassing rate limits)`);
  }
  console.log("=========================================================");

  if (options.once) {
    await runAutonomousCycle(options);
    process.exit(0);
  }

  // Initial execution check
  await runAutonomousCycle(options);

  // Periodic loop: check every hour (or smaller if intervalDays < 1 hour)
  const checkIntervalMs = Math.min(options.intervalDays * 24 * 60 * 60 * 1000, 60 * 60 * 1000);
  console.log(`\n💤 Daemon heartbeat scheduled (evaluates rate limits every ${(checkIntervalMs / (60 * 1000)).toFixed(0)} min)...`);

  setInterval(async () => {
    await runAutonomousCycle(options);
  }, checkIntervalMs);
}

main().catch((err) => {
  console.error("❌ Fatal daemon error:", err);
  process.exit(1);
});

