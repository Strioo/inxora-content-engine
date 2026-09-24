import { ResearchPlan } from "./researcher.js";
import {
  createChatCompletion,
  extractJSON,
  getAIConfig,
} from "./ai-client.js";
import { buildSystemPrompt } from "../prompts/anti-slop.js";

export interface TechnicalBlueprint {
  coreFailureScenario: string;
  quantitativeMetrics: {
    peakRpsOrLoad: string;
    targetLatencyP99: string;
    concurrencyConstraint: string;
  };
  sectionOutlines: {
    heading: string;
    keyPoints: string[];
    technicalRationale: string;
  }[];
  codeSpecification: {
    purpose: string;
    functionSignature: string;
    edgeCasesToHandle: string[];
  };
  tradeOffMatrix: {
    parameter: string;
    naiveApproach: string;
    inxoraStandard: string;
  }[];
}

export interface RawDraft {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
}

export interface PolishedArticle {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  metaTitle: string;
  metaDesc: string;
  category: string;
}

/**
 * Stage 1: The System Architect Agent
 * Designs the deep technical blueprint, quantitative failure scenarios, and code contracts.
 */
export async function runArchitectStage(plan: ResearchPlan): Promise<TechnicalBlueprint> {
  const config = getAIConfig();
  console.log(`  [Orchestra 1/3: Architect Agent] Designing technical blueprint (Model: ${config.architectModel})...`);

  const systemPrompt = `You are a Principal Distributed Systems & Cloud Architect.
Your task is to create a deeply technical, quantitative blueprint for an engineering article on "${plan.topic}".
Target Category: ${plan.category}
Narrative Archetype: ${plan.archetype.name} - ${plan.archetype.tagline}
Industry Context: ${plan.industry.name} (${plan.industry.workloadDescription})

You DO NOT write the article yet. You design the exact engineering specifications, bottlenecks, and code blueprint.
Return ONLY valid JSON matching this structure:
{
  "coreFailureScenario": "Deskripsi konkret insiden kegagalan sistem atau bottleneck nyata pada industri ini",
  "quantitativeMetrics": {
    "peakRpsOrLoad": "Beban kuantitatif (misal: 45.000 req/s, 10M events/day)",
    "targetLatencyP99": "Batas latensi p99 SLA (misal: < 120ms)",
    "concurrencyConstraint": "Batas konkurensi (misal: max 200 pool connections, zero race-conditions)"
  },
  "sectionOutlines": [
    {
      "heading": "Judul H2 spesifik sesuai archetype",
      "keyPoints": ["Poin teknis 1", "Poin teknis 2"],
      "technicalRationale": "Alasan rekayasa mendalam"
    }
  ],
  "codeSpecification": {
    "purpose": "Tujuan proteksi kode",
    "functionSignature": "Contoh: executeHardenedPipeline<T>(...): Promise<T>",
    "edgeCasesToHandle": ["Idempotency token", "Timeout abort signal", "Exponential backoff with jitter"]
  },
  "tradeOffMatrix": [
    {
      "parameter": "Parameter arsitektur",
      "naiveApproach": "Pendekatan konvensional yang bermasalah",
      "inxoraStandard": "Standar rekayasa Inxora yang tahan banting"
    }
  ]
}`;

  const userPrompt = `Create the technical architecture blueprint for:
Topic: "${plan.topic}"
Archetype Blueprint Headings:
${plan.archetype.headingBlueprint.h2Sections.map((s) => `- ${s}`).join("\n")}

Industry Edge Cases:
${plan.industry.complianceOrEdgeCase}
${plan.industry.codeContextHint}

${plan.antiCannibalizationPrompt}`;

  const responseText = await createChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      model: config.architectModel,
      temperature: 0.6,
    }
  );

  return extractJSON<TechnicalBlueprint>(responseText);
}

/**
 * Stage 2: The Senior Technical Writer Agent
 * Expands the blueprint into comprehensive, publication-grade HTML content without AI slop.
 */
export async function runWriterStage(
  plan: ResearchPlan,
  blueprint: TechnicalBlueprint
): Promise<RawDraft> {
  const config = getAIConfig();
  console.log(`  [Orchestra 2/3: Senior Writer Agent] Crafting full implementation (Model: ${config.writerModel})...`);

  const systemPrompt = `${buildSystemPrompt(plan.category)}

You are the Senior Technical Author (Persona: Wahid Satrio Aji) at Inxora Studio.
You must expand the provided Technical Blueprint into a complete, comprehensive, publication-ready engineering article in Indonesian.
Tone: Pragmatic, direct, authoritative, highly technical.
Strict Rules:
- NO generic AI intros ("In today's fast-paced digital world..."). Start immediately with the core operational problem.
- Must include a semantic comparison <table> with styling inline.
- Must include a full, working TypeScript code block (<pre><code class="language-typescript">...</code></pre>) implementing the specified code contracts with error handling.
- Must use semantic <h2> and <h3> tags for the Table of Contents jump-to links.

Return ONLY valid JSON:
{
  "title": "Judul spesifik dan memikat sesuai arketipe",
  "excerpt": "Ringkasan 1-2 kalimat (max 180 karakter) yang menjawab akar masalah",
  "content": "HTML semantik lengkap (h2, h3, p, pre/code, table, blockquote) tanpa wrapper \`\`\`html",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}`;

  const userPrompt = `Topic: "${plan.topic}"
Category: ${plan.category}
Archetype: ${plan.archetype.name} (${plan.archetype.tagline})
Industry Context: ${plan.industry.name}

Technical Blueprint to Expand:
${JSON.stringify(blueprint, null, 2)}

Write the full, deep technical article now in valid JSON.`;

  const responseText = await createChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      model: config.writerModel,
      temperature: 0.7,
    }
  );

  return extractJSON<RawDraft>(responseText);
}

/**
 * Stage 3: The Anti-Slop & Quality Reviewer Agent
 * Audits the draft, strips any remaining cliches, hardens code, and polishes SEO metadata.
 */
export async function runReviewerStage(
  plan: ResearchPlan,
  rawDraft: RawDraft
): Promise<PolishedArticle> {
  const config = getAIConfig();
  console.log(`  [Orchestra 3/3: Reviewer & Anti-Slop Auditor] Hardening content & SEO metadata (Model: ${config.reviewerModel})...`);

  const systemPrompt = `You are the Principal Technical Editor, SEO & Security Auditor at Inxora Studio.
Your task is to audit and polish the raw technical article draft to guarantee zero AI slop and flawless SEO readiness.

Review Checklist:
1. Anti-Slop Audit: If the first paragraph contains generic AI throat-clearing ("Dalam era digital yang berkembang pesat...", "Penting bagi kita...", dll), REPLACE or CUT it immediately with a razor-sharp technical opening.
2. Code & Security Audit: Verify that the code inside <pre><code> has complete imports, typed signatures, and defensive error handling.
3. Structure & ToC Audit: Ensure all <h2> headings are clear and URL-slug friendly.
4. Metadata Hardening:
   - metaTitle: Maximum 68 characters, punchy, ending with " · Inxora".
   - metaDesc: Maximum 155 characters, concise value proposition.

Return ONLY valid JSON:
{
  "title": "Judul terpoles",
  "excerpt": "Excerpt terpoles (max 180 karakter)",
  "content": "Konten HTML terpoles yang bersih dan siap terbit",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "metaTitle": "Title untuk SEO meta tag (max 68 chars)",
  "metaDesc": "Deskripsi meta untuk Google snippet (max 155 chars)"
}`;

  const userPrompt = `Raw Draft to Audit & Polish:
${JSON.stringify(rawDraft, null, 2)}

Audit and return the final publication-ready JSON.`;

  const responseText = await createChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      model: config.reviewerModel,
      temperature: 0.3, // Low temperature for strict audit
    }
  );

  const polished = extractJSON<{
    title: string;
    excerpt: string;
    content: string;
    tags: string[];
    metaTitle: string;
    metaDesc: string;
  }>(responseText);

  const safeTitle = polished.title?.slice(0, 95) || rawDraft.title;
  const safeExcerpt = (polished.excerpt || rawDraft.excerpt).slice(0, 200);
  const safeMetaTitle =
    polished.metaTitle?.length > 68
      ? polished.metaTitle.slice(0, 68)
      : polished.metaTitle || `${safeTitle.slice(0, 55)} · Inxora`;
  const safeMetaDesc = (polished.metaDesc || safeExcerpt).slice(0, 155);

  return {
    title: safeTitle,
    excerpt: safeExcerpt,
    content: polished.content || rawDraft.content,
    tags: polished.tags && polished.tags.length > 0 ? polished.tags : rawDraft.tags,
    metaTitle: safeMetaTitle,
    metaDesc: safeMetaDesc,
    category: plan.category,
  };
}

/**
 * Executes the complete 3-stage AI Orchestra Pipeline.
 */
export async function runOrchestraPipeline(plan: ResearchPlan): Promise<PolishedArticle> {
  // Stage 1: Architect Blueprint
  const blueprint = await runArchitectStage(plan);

  // Stage 2: Senior Writer Drafting
  const rawDraft = await runWriterStage(plan, blueprint);

  // Stage 3: Reviewer & Quality Hardening
  const polishedArticle = await runReviewerStage(plan, rawDraft);

  return polishedArticle;
}

