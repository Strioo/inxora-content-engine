import "dotenv/config";
import { researchTopic, ResearchOptions } from "./services/researcher.js";
import { resolveCoverImage } from "./services/image-generator.js";
import { resolveArticleVisualPackage } from "./services/image-generator.js";
import { generateArticle } from "./services/writer.js";
import { publishArticle, IngestPayload, reportJobProgress } from "./services/publisher.js";
import { recordArticleInHistory, getAllUsedCoverImages } from "./services/history-guard.js";
import { fetchInxoraKnowledgeContext } from "./services/context-fetcher.js";
import { precomputeInternalLinks } from "./services/autolinker.js";
import { repurposeForSocial } from "./services/social-repurposer.js";
import { dispatchTeamNotification } from "./services/notifier.js";
import { INXORA_AUTHOR } from "./config.js";
import { getAIConfig } from "./services/ai-client.js";
import {
  discoverTopics,
  getNextBacklogTopic,
  markBacklogTopicStatus,
  BacklogTopicItem,
} from "./services/topic-discovery.js";

function parseArgs(): {
  topic?: string;
  category?: string;
  archetype?: string;
  industry?: string;
  publish?: boolean;
  draft?: boolean;
  publishStatus?: "DRAFT" | "PUBLISHED";
  author?: string;
  discover?: boolean;
  fromBacklog?: boolean;
  count?: number;
  jobId?: string;
} {
  const args = process.argv.slice(2);
  const options: {
    topic?: string;
    category?: string;
    archetype?: string;
    industry?: string;
    publish?: boolean;
    draft?: boolean;
    publishStatus?: "DRAFT" | "PUBLISHED";
    author?: string;
    discover?: boolean;
    fromBacklog?: boolean;
    count?: number;
    jobId?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--job-id=")) {
      options.jobId = arg.slice(9);
    } else if (arg === "--job-id" && args[i + 1]) {
      options.jobId = args[++i];
    } else if (arg === "--discover" || arg === "--discover-topics") {
      options.discover = true;
    } else if (arg.startsWith("--count=")) {
      options.count = parseInt(arg.slice(8), 10);
    } else if (arg === "--from-backlog") {
      options.fromBacklog = true;
    } else if (arg.startsWith("--topic=")) {
      options.topic = arg.slice(8);
    } else if (arg === "--topic" && args[i + 1]) {
      options.topic = args[++i];
    } else if (arg.startsWith("--category=")) {
      options.category = arg.slice(11);
    } else if (arg === "--category" && args[i + 1]) {
      options.category = args[++i];
    } else if (arg.startsWith("--archetype=")) {
      options.archetype = arg.slice(12);
    } else if (arg === "--archetype" && args[i + 1]) {
      options.archetype = args[++i];
    } else if (arg.startsWith("--industry=")) {
      options.industry = arg.slice(11);
    } else if (arg === "--industry" && args[i + 1]) {
      options.industry = args[++i];
    } else if (arg.startsWith("--author=")) {
      options.author = arg.slice(9);
    } else if (arg === "--author" && args[i + 1]) {
      options.author = args[++i];
    } else if (arg === "--publish") {
      options.publish = true;
      options.publishStatus = "PUBLISHED";
    } else if (arg === "--draft") {
      options.draft = true;
      options.publish = false;
      options.publishStatus = "DRAFT";
    } else if (arg.startsWith("--publish-status=")) {
      const val = arg.slice(17).toUpperCase();
      if (val === "DRAFT" || val === "PUBLISHED") {
        options.publishStatus = val;
        options.publish = val === "PUBLISHED";
        options.draft = val === "DRAFT";
      }
    } else if (arg === "--publish-status" && args[i + 1]) {
      const val = args[++i].toUpperCase();
      if (val === "DRAFT" || val === "PUBLISHED") {
        options.publishStatus = val;
        options.publish = val === "PUBLISHED";
        options.draft = val === "DRAFT";
      }
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const aiConfig = getAIConfig();

  console.log("=========================================================");
  console.log("🚀 Inxora Autonomous AI Content Engine (Organic SEO Edition)");
  console.log("=========================================================");
  if (aiConfig.apiKey) {
    console.log(`📡 AI Endpoint       : ${aiConfig.endpoint}`);
    console.log(`🔬 Stage 0: Research  : ${aiConfig.researcherModel}`);
    console.log(`📐 Stage 1: Architect : ${aiConfig.architectModel}`);
    console.log(`✍️  Stage 2: Writer    : ${aiConfig.writerModel}`);
    console.log(`🛡️  Stage 3: Reviewer  : ${aiConfig.reviewerModel} (Fallback: ${aiConfig.reviewerFallbackModel})`);
  } else {
    console.log(`⚙️ Mode              : Procedural Organic SEO Engine (No AI key configured)`);
  }
  console.log("=========================================================");

  if (options.discover) {
    await discoverTopics(options.count || 15);
    return;
  }

  let selectedBacklogItem: BacklogTopicItem | null = null;
  if (options.fromBacklog) {
    selectedBacklogItem = await getNextBacklogTopic();
    if (!selectedBacklogItem) {
      console.log("\n⚠️ Antrean topik di backlog kosong. Menjalankan auto-discovery topik baru...");
      await discoverTopics(15);
      selectedBacklogItem = await getNextBacklogTopic();
    }

    if (selectedBacklogItem) {
      console.log(`\n📋 Mengambil Topik dari Backlog Antrean:`);
      console.log(`   - Topik    : "${selectedBacklogItem.topic}"`);
      console.log(`   - Kategori : ${selectedBacklogItem.category}`);
      console.log(`   - Archetype: ${selectedBacklogItem.archetype}`);
      console.log(`   - Industry : ${selectedBacklogItem.industry}`);
      console.log(`   - Priority : [${selectedBacklogItem.priority}]`);
      options.topic = selectedBacklogItem.topic;
      options.category = selectedBacklogItem.category;
      options.archetype = selectedBacklogItem.archetype;
      options.industry = selectedBacklogItem.industry;
      markBacklogTopicStatus(selectedBacklogItem.id, "IN_PROGRESS");
    }
  }

  const topic =
    options.topic ||
    "Panduan Memilih Tech Stack Website Bisnis: Next.js vs Alternatif Tradisional";

  try {
    // Stage 0: Dynamic Inxora Knowledge Graph & Context Whitelist
    console.log(`\n[Stage 0/4] Fetching dynamic Inxora Knowledge Graph from live web...`);
    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "RESEARCHING",
        progress: 15,
        currentStep: "Fetching Inxora Knowledge Graph & live context",
      });
    }

    const knowledgeContext = await fetchInxoraKnowledgeContext();
    console.log(`✓ Live Services Available   : ${knowledgeContext.services.map((s) => s.name).join(", ")}`);
    console.log(`✓ Published Posts Monitored : ${knowledgeContext.existingPosts.length} articles`);
    console.log(`✓ Internal URLs Whitelist   : ${knowledgeContext.validInternalUrls.length} verified routes`);

    // Stage 1: Deep SERP Research, Search Intent & Narrative Strategy
    console.log(`\n[Stage 1/4] Researching live SERP signals, search intent & narrative strategy...`);
    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "RESEARCHING",
        progress: 25,
        currentStep: "Analyzing SERP signals, search intent & narrative strategy",
      });
    }

    const researchOptions: ResearchOptions = {
      category: options.category,
      archetype: options.archetype,
      industry: options.industry,
      context: knowledgeContext,
    };

    const research = await researchTopic(topic, researchOptions);
    console.log(`✓ Target Topic       : "${research.topic}"`);
    console.log(`✓ Resolved Category  : ${research.category}`);
    console.log(`✓ Narrative Archetype: [${research.archetype.name}] - ${research.archetype.tagline}`);
    console.log(`✓ Industry Context   : [${research.industry.name}]`);
    console.log(`✓ Search Intent      : ${research.searchIntent}`);
    console.log(`✓ Google Suggestions : ${research.serpSignals?.googleQueries?.slice(0, 3).join(", ") || "N/A"}`);
    console.log(`✓ Live Articles Found: ${research.serpSignals?.trendingArticles?.length || 0} references analyzed`);
    if (research.existingArticles.length > 0) {
      console.log(`✓ Dedup Guard Active : ${research.existingArticles.length} recent published articles monitored`);
    }

    // Stage 2: Aesthetic Multi-Image Package with Strict Deduplication Guard
    console.log(`\n[Stage 2/4] Resolving aesthetic multi-image visual package & free licenses...`);
    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "WRITING",
        progress: 45,
        currentStep: "Curating aesthetic visual package & free licenses",
      });
    }

    const usedImages = await getAllUsedCoverImages(process.env.INXORA_API_URL);
    for (const art of research.existingArticles) {
      if (art.coverImage) {
        usedImages.add(art.coverImage);
      }
    }

    const visualPackage = await resolveArticleVisualPackage(
      topic,
      research.category,
      research.dossier?.visualKeywords || [],
      usedImages
    );
    console.log(`✓ Cover Image URL    : ${visualPackage.cover.coverUrl}`);
    console.log(`✓ Cover Source       : ${visualPackage.cover.attribution.source} (License: ${visualPackage.cover.attribution.license})`);
    console.log(`✓ Cover Attribution  : Photo by ${visualPackage.cover.attribution.author} (${visualPackage.cover.attribution.authorUrl})`);
    if (visualPackage.inlineVisual) {
      console.log(`✓ Inline Visual URL  : ${visualPackage.inlineVisual.coverUrl}`);
      console.log(`✓ Inline Attribution : Photo by ${visualPackage.inlineVisual.attribution.author} on ${visualPackage.inlineVisual.attribution.source}`);
    }

    // Stage 3: Orchestra Generation with Iterative Quality Loop
    console.log(`\n[Stage 3/4] Running Orchestra Engine with Iterative Quality Loop...`);
    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "WRITING",
        progress: 65,
        currentStep: "Synthesizing deep article narrative & code blocks",
      });
    }

    const article = await generateArticle(research, visualPackage);
    console.log(`\n✓ Final Article Title : ${article.title}`);
    console.log(`✓ Article Excerpt    : ${article.excerpt.slice(0, 100)}...`);
    console.log(`✓ Tags Identified    : ${article.tags.join(", ")}`);
    console.log(`✓ SEO Meta Title     : ${article.metaTitle}`);
    console.log(`✓ SEO Meta Desc      : ${article.metaDesc}`);
    if (article.faqItems && article.faqItems.length > 0) {
      console.log(`✓ FAQ Schema Items   : ${article.faqItems.length} Q&As prepared for Google rich snippets`);
    }
    if (article.titleVariants) {
      console.log(`✓ Title Hook Variants:`);
      console.log(`   • Search Intent   : "${article.titleVariants.searchIntent}"`);
      console.log(`   • Pain Point / ROI: "${article.titleVariants.painPointROI}"`);
      console.log(`   • Deep Curiosity  : "${article.titleVariants.curiosityInsight}"`);
    }
    if (article.finalScore) {
      console.log(`✓ Final Quality Score: ${article.finalScore}/100 (Cycles: ${article.iterationsCount || 1})`);
    }

    // Pre-Compute Wikipedia-Style Internal Linking into Article Content
    console.log(`\n[Pre-Linking] Pre-computing contextual internal links...`);
    const { html: linkedContent, linkedCount } = precomputeInternalLinks(
      article.content,
      knowledgeContext.existingPosts
    );
    if (linkedCount > 0) {
      console.log(`✓ Injected ${linkedCount} internal article links directly into HTML payload`);
    }

    // Stage 4: Ingestion & Publishing
    console.log(`\n[Stage 4/4] Ingesting into Inxora Production Web via Webhook...`);
    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "REVIEWING",
        progress: 85,
        currentStep: "Validating editorial quality score, FAQ schema & link equity",
      });
    }

    const publishStatus: "DRAFT" | "PUBLISHED" =
      options.publishStatus || (options.publish ? "PUBLISHED" : "DRAFT");

    const payload: IngestPayload = {
      title: article.title,
      excerpt: article.excerpt,
      content: linkedContent,
      coverImage: visualPackage.cover.coverUrl,
      imageAttribution: visualPackage.cover.attribution,
      category: article.category,
      tags: article.tags,
      authorSlug: options.author || INXORA_AUTHOR.slug,
      status: publishStatus,
      metaTitle: article.metaTitle,
      metaDesc: article.metaDesc,
      faqItems: article.faqItems,
      metadata: article.metadata,
    };

    const publishResult = await publishArticle(payload);

    if (!publishResult.success || !publishResult.post) {
      const errMsg = publishResult.message || publishResult.error || "Failed to publish article";
      console.error(`\n❌ Failed to publish article: ${errMsg}`);
      if (selectedBacklogItem) {
        markBacklogTopicStatus(selectedBacklogItem.id, "FAILED", errMsg);
      }
      if (options.jobId) {
        await reportJobProgress({
          jobId: options.jobId,
          status: "FAILED",
          error: errMsg,
          currentStep: "Publishing failed",
        });
      }
      process.exit(1);
    }

    const livePublicUrl = `http://localhost:3000${publishResult.post.url}`;
    const adminEditUrl = `http://localhost:3000/admin/blog/${publishResult.post.id}/edit`;

    if (selectedBacklogItem) {
      markBacklogTopicStatus(selectedBacklogItem.id, "PUBLISHED", publishResult.post.url);
    }

    // Cache in local history for anti-cannibalization and image dedup
    recordArticleInHistory({
      title: publishResult.post.title,
      slug: publishResult.post.slug,
      category: publishResult.post.category,
      coverImage: visualPackage.cover.coverUrl,
      publishedAt: new Date().toISOString(),
    });

    if (visualPackage.inlineVisual) {
      recordArticleInHistory({
        title: `[Inline Visual] ${publishResult.post.title}`,
        slug: `${publishResult.post.slug}-inline`,
        category: publishResult.post.category,
        coverImage: visualPackage.inlineVisual.coverUrl,
        publishedAt: new Date().toISOString(),
      });
    }

    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "COMPLETED",
        progress: 100,
        currentStep: "Article published successfully",
        articleSlug: publishResult.post.slug,
        articleUrl: publishResult.post.url,
      });
    }

    // Stage 5: Omnichannel Social Media Repurposing & Team Dispatch
    console.log(`\n[Stage 5] Omnichannel Social Media Repurposing & Team Alert...`);
    const socialSnippets = await repurposeForSocial(article, livePublicUrl);

    await dispatchTeamNotification({
      title: publishResult.post.title,
      slug: publishResult.post.slug,
      excerpt: article.excerpt,
      category: publishResult.post.category,
      qualityScore: article.finalScore || 90,
      coverImageUrl: visualPackage.cover.coverUrl,
      coverAttribution: `${visualPackage.cover.attribution.author} (${visualPackage.cover.attribution.source})`,
      publicUrl: livePublicUrl,
      adminEditUrl: adminEditUrl,
      faqCount: article.faqItems?.length || 0,
      socialSnippets: {
        linkedIn: socialSnippets.linkedIn,
        twitter: socialSnippets.twitterThread.join("\n\n"),
        newsletter: socialSnippets.newsletterBlurb,
      },
    });

    console.log("\n=========================================================");
    console.log(`🎉 ARTICLE INGESTED & ${payload.status} SUCCESSFULLY!`);
    console.log("=========================================================");
    console.log(`ID         : ${publishResult.post.id}`);
    console.log(`Title      : ${publishResult.post.title}`);
    console.log(`Slug       : ${publishResult.post.slug}`);
    console.log(`Archetype  : ${research.archetype.name}`);
    console.log(`Industry   : ${research.industry.name}`);
    console.log(`Category   : ${publishResult.post.category}`);
    console.log(`Status     : ${publishResult.post.status}`);
    console.log(`Author     : ${publishResult.post.author}`);
    console.log(`Cover Photo: ${visualPackage.cover.attribution.author} on ${visualPackage.cover.attribution.source}`);
    if (visualPackage.inlineVisual) {
      console.log(`Body Visual: ${visualPackage.inlineVisual.attribution.author} on ${visualPackage.inlineVisual.attribution.source}`);
    }
    console.log(`Live URL   : ${livePublicUrl}`);
    console.log("=========================================================\n");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const targetTopicId = selectedBacklogItem ? selectedBacklogItem.id : topic;
    if (targetTopicId) {
      markBacklogTopicStatus(targetTopicId, "FAILED", errorMsg);
    }
    if (options.jobId) {
      await reportJobProgress({
        jobId: options.jobId,
        status: "FAILED",
        error: errorMsg,
        currentStep: "Fatal generation error",
      });
    }
    throw err;
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal execution error:", err);
  process.exit(1);
});
