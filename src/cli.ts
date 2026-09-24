import "dotenv/config";
import { researchTopic } from "./services/researcher.js";
import { researchTopic, ResearchOptions } from "./services/researcher.js";
import { resolveCoverImage } from "./services/image-generator.js";
import { generateArticle } from "./services/writer.js";
import { publishArticle, IngestPayload } from "./services/publisher.js";
import { recordArticleInHistory } from "./services/history-guard.js";
import { INXORA_AUTHOR } from "./config.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    topic?: string;
    category?: string;
    archetype?: string;
    industry?: string;
    publish?: boolean;
    author?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--topic=")) {
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
    }
  }

  return options;
}

async function main() {
  console.log("=========================================================");
  console.log("🚀 Inxora Autonomous AI Content Engine (Anti-Slop Edition)");
  console.log("🚀 Inxora Autonomous AI Content Engine (Diversity Edition)");
  console.log("=========================================================");

  const options = parseArgs();
  const topic =
    options.topic ||
    "Panduan Optimasi Query Prisma ORM pada Database Skala Besar";

  console.log(`\n[Stage 1/4] Researching topic & search intent...`);
  const research = researchTopic(topic, options.category);
  console.log(`\n[Stage 1/4] Researching topic, intent & narrative diversity...`);
  const researchOptions: ResearchOptions = {
    category: options.category,
    archetype: options.archetype,
    industry: options.industry,
  };

  const research = await researchTopic(topic, researchOptions);
  console.log(`✓ Target Topic      : "${research.topic}"`);
  console.log(`✓ Resolved Category : ${research.category}`);
  console.log(`✓ Narrative Archetype: [${research.archetype.name}] - ${research.archetype.tagline}`);
  console.log(`✓ Industry Context  : [${research.industry.name}]`);
  console.log(`✓ Search Intent     : ${research.searchIntent}`);
  console.log(`✓ Target Audience   : ${research.targetAudience}`);
  if (research.existingArticles.length > 0) {
    console.log(`✓ Dedup Guard Active: ${research.existingArticles.length} recent published articles monitored`);
  }

  console.log(`\n[Stage 2/4] Resolving aesthetic visual assets...`);
  const image = await resolveCoverImage(topic, research.category);
  console.log(`✓ Cover Image Asset : ${image.coverUrl}`);

  console.log(`\n[Stage 3/4] Drafting high-gain technical content (Anti-Slop rules active)...`);
  console.log(`\n[Stage 3/4] Drafting high-gain technical content (Anti-Slop & Diversity active)...`);
  const article = await generateArticle(research);
  console.log(`✓ Article Title     : ${article.title}`);
  console.log(`✓ Article Excerpt   : ${article.excerpt.slice(0, 100)}...`);
  console.log(`✓ Tags Identified   : ${article.tags.join(", ")}`);

  console.log(`\n[Stage 4/4] Ingesting into Inxora Production Web via Webhook...`);
  const payload: IngestPayload = {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    coverImage: image.coverUrl,
    category: article.category,
    tags: article.tags,
    authorSlug: options.author || INXORA_AUTHOR.slug,
    status: options.publish ? "PUBLISHED" : "DRAFT",
    metaTitle: article.metaTitle,
    metaDesc: article.metaDesc,
  };

  const publishResult = await publishArticle(payload);

  if (!publishResult.success || !publishResult.post) {
    console.error(`\n❌ Failed to publish article: ${publishResult.error}`);
    process.exit(1);
  }

  // Record into history cache for anti-cannibalization guard
  recordArticleInHistory({
    title: publishResult.post.title,
    slug: publishResult.post.slug,
    category: publishResult.post.category,
  });

  console.log("\n=========================================================");
  console.log("🎉 ARTICLE INGESTED SUCCESSFULLY!");
  console.log("=========================================================");
  console.log(`ID       : ${publishResult.post.id}`);
  console.log(`Title    : ${publishResult.post.title}`);
  console.log(`Slug     : ${publishResult.post.slug}`);
  console.log(`Status   : ${publishResult.post.status}`);
  console.log(`Author   : ${publishResult.post.author}`);
  console.log(`URL      : ${publishResult.post.url}`);
  console.log(`ID        : ${publishResult.post.id}`);
  console.log(`Title     : ${publishResult.post.title}`);
  console.log(`Slug      : ${publishResult.post.slug}`);
  console.log(`Archetype : ${research.archetype.name}`);
  console.log(`Industry  : ${research.industry.name}`);
  console.log(`Status    : ${publishResult.post.status}`);
  console.log(`Author    : ${publishResult.post.author}`);
  console.log(`URL       : ${publishResult.post.url}`);
  console.log("=========================================================\n");
}

main().catch((err) => {
  console.error("Fatal engine error:", err);
  process.exit(1);
});

