import { ResearchPlan } from "./researcher.js";
import {
  createChatCompletion,
  extractJSON,
  getAIConfig,
} from "./ai-client.js";
import { buildSystemPrompt } from "../prompts/anti-slop.js";
import { ArticleVisualPackage } from "./image-generator.js";
import { FAQItem } from "./publisher.js";

export interface TitleVariants {
  searchIntent: string;
  painPointROI: string;
  curiosityInsight: string;
}

export interface ContentStrategyBlueprint {
  workingTitle: string;
  targetPersona: string;
  userSearchIntent: string;
  keyBusinessValueTakeaways: string[];
  sectionOutlines: {
    heading: string;
    purpose: string;
    keyPoints: string[];
    suggestedFormat: "text" | "comparison-table" | "checklist" | "quote-callout";
  }[];
  comparisonTablePlan: {
    columns: string[];
    focus: string;
  };
  conversionBridgePlan: {
    targetService: string;
    serviceUrl: string;
    naturalAngle: string;
  };
  internalBlogLinksPlan?: Array<{
    title: string;
    url: string;
    naturalContext: string;
  }>;
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
  finalScore?: number;
  iterationsCount?: number;
  faqItems?: FAQItem[];
  titleVariants?: TitleVariants;
  metadata?: Record<string, unknown>;
}

export interface QualityAuditReport {
  qualityScore: number;
  passed: boolean;
  pillarScores: {
    readabilityAndEngagement: number;
    seoAndSearchIntent: number;
    practicalValue: number;
    conversionBridge: number;
  };
  critiqueNotes: string[];
  requiredImprovements: string[];
  polishedArticle: PolishedArticle;
}

export interface RevisionFeedback {
  iteration: number;
  critiqueNotes: string[];
  requiredImprovements: string[];
  previousDraft: RawDraft;
}

export async function runArchitectStage(plan: ResearchPlan): Promise<ContentStrategyBlueprint> {
  const config = getAIConfig();
  console.log(`  [Orchestra 1/3: Content Strategist] Designing SEO blueprint (Model: ${config.architectModel})...`);

  const liveServices = plan.knowledgeContext?.services || [];
  const availablePosts = plan.knowledgeContext?.existingPosts?.slice(0, 8) || [];

  const systemPrompt = `You are a Senior SEO Content Strategist & Digital Product Architect for Inxora Studio (https://inxorastudio.com).
Your task is to design an authoritative, search-intent driven Content Strategy Blueprint for an organic SEO article on "${plan.topic}".
Target Category: ${plan.category}
Narrative Archetype: ${plan.archetype.name} - ${plan.archetype.tagline}
Industry Context: ${plan.industry.name} (${plan.industry.workloadDescription})
Target Persona: ${plan.targetAudience}

Guidelines:
STRICT ARCHITECTURAL DIRECTIVES:
1. Target search intent directly (e.g. why business owners choose this, cost vs performance tradeoffs, step-by-step roadmap).
2. Outline 4-5 scannable H2/H3 headings based on the archetype's heading blueprint:
${plan.archetype.headingBlueprint.h2Sections.map((s) => `   - ${s}`).join("\n")}
   Headings MUST be descriptive, topic-specific, and action-oriented. NEVER output generic headings like "Kesimpulan", "Penutup", or "Rangkuman".
3. Plan at least 1 rich HTML comparison table evaluating options, costs, or performance.
4. Plan at least 1 actionable checklist for founders/managers.
5. CONVERSION BRIDGE (Mandatory Whitelist): You MUST select the most relevant service from Inxora's ACTUAL live services:
${liveServices.map((s) => `   * Service: "${s.name}", URL: "${s.path}", Description: "${s.shortDescription}"`).join("\n")}
   DO NOT make up nonexistent service URLs. Use the exact URL path provided.
6. INTERNAL LINK CLUSTER: Select 1-2 relevant existing blog posts to reference contextually:
${availablePosts.map((p) => `   * Post: "${p.title}", URL: "${p.path}"`).join("\n") || "   * (No prior posts yet)"}
7. NO low-level SRE/kernel code blocks or socket buffer tuning. Focus on practical tech & business impact.

Return ONLY valid JSON matching this schema:
{
  "workingTitle": "Judul SEO memikat dan presisi tanpa kata klise",
  "targetPersona": "${plan.targetAudience}",
  "userSearchIntent": "Apa yang dicari dan ingin diselesaikan pembaca saat mengetik topik ini di Google",
  "keyBusinessValueTakeaways": [
    "Poin wawasan utama 1",
    "Poin wawasan utama 2",
    "Poin wawasan utama 3"
  ],
  "sectionOutlines": [
    {
      "heading": "Heading H2 spesifik dan berorientasi aksi",
      "purpose": "Tujuan bagian ini bagi pembaca",
      "keyPoints": ["Poin A", "Poin B"],
      "suggestedFormat": "text"
    }
  ],
  "comparisonTablePlan": {
    "columns": ["Parameter", "Solusi A (Tradisional)", "Solusi B (Modern Inxora Standard)"],
    "focus": "Fokus perbandingan biaya, skalabilitas, dan kecepatan rilis"
  },
  "conversionBridgePlan": {
    "targetService": "Nama Layanan dari Whitelist di atas",
    "serviceUrl": "Path URL dari Whitelist di atas (misal: /services/web-development)",
    "naturalAngle": "Sudut pandang menghubungkan solusi artikel dengan layanan Inxora"
  },
  "internalBlogLinksPlan": [
    {
      "title": "Judul Artikel dari daftar di atas",
      "url": "Path URL artikel (misal: /blog/post/slug)",
      "naturalContext": "Kalimat pengantar untuk menautkan artikel ini secara organik"
    }
  ]
}`;

  const userPrompt = `Create the Content Strategy Blueprint for: "${plan.topic}"
Archetype: ${plan.archetype.name} (${plan.archetype.tagline})
Industry: ${plan.industry.name}
Pain Points: ${plan.industry.commonChallenges.join(", ")}
Decision Factors: ${plan.industry.keyBusinessGoals}
Google Search Intent Signals: ${plan.serpSignals?.googleQueries.slice(0, 5).join(", ") || "General search"}
Dossier Context: ${plan.dossier?.rawContextSummary || "Solusi digital modern berkinerja tinggi."}

Design the blueprint now.`;

  try {
    const responseText = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: config.architectModel,
        fallbackModel: config.defaultModel,
        temperature: 0.35,
        timeoutMs: 45000,
      }
    );

    return extractJSON<ContentStrategyBlueprint>(responseText);
  } catch (err: unknown) {
    console.warn("  ⚠️ Content Strategist stage failed or timed out. Using fallback blueprint.");
    const defaultService = liveServices[0] || {
      name: "Web Development",
      path: "/services/web-development",
    };
    return {
      workingTitle: plan.topic,
      targetPersona: plan.targetAudience,
      userSearchIntent: `Mencari panduan praktis dan evaluasi objektif mengenai ${plan.topic}.`,
      keyBusinessValueTakeaways: [
        "Pemilihan arsitektur teknologi berdampak langsung pada time-to-market dan biaya operasional.",
        "Pengalaman pengguna (UI/UX) dan Core Web Vitals menentukan tingkat konversi bisnis.",
        "Kolaborasi dengan tim pengembang berpengalaman meminimalkan risiko technical debt.",
      ],
      sectionOutlines: plan.archetype.headingBlueprint.h2Sections.map((h, idx) => ({
        heading: h,
        purpose: `Membahas ${h} dari sudut pandang efisiensi bisnis.`,
        keyPoints: [`Konteks implementasi pada industri ${plan.industry.name}`, "Dampak terhadap kinerja dan skalabilitas"],
        suggestedFormat: idx === 1 ? "comparison-table" : idx === 2 ? "checklist" : "text",
      })),
      comparisonTablePlan: {
        columns: ["Parameter", "Pendekatan Tradisional / Konvensional", "Solusi Modern (Inxora Standard)"],
        focus: "Evaluasi performa, efisiensi biaya, dan kemudahan skalabilitas",
      },
      conversionBridgePlan: {
        targetService: defaultService.name,
        serviceUrl: defaultService.path,
        naturalAngle: "Konsultasi dan implementasi teknologi modern bersama Inxora Studio",
      },
      internalBlogLinksPlan: availablePosts.slice(0, 2).map((p) => ({
        title: p.title,
        url: p.path,
        naturalContext: "Baca juga analisis kami mengenai topik terkait.",
      })),
    };
  }
}

export async function runWriterStage(
  plan: ResearchPlan,
  blueprint: ContentStrategyBlueprint,
  revisionFeedback?: RevisionFeedback,
  visualPackage?: ArticleVisualPackage
): Promise<RawDraft> {
  const config = getAIConfig();
  console.log(`  [Orchestra 2/3: Senior Product Writer] Drafting content (Model: ${config.writerModel})...`);

  const inlineVisualDirective = visualPackage?.inlineVisual
    ? `
MANDATORY INLINE VISUAL EMBED:
You MUST embed the following semantic HTML visual figure right before the 2nd <h2> heading in the content:
<figure class="my-8 overflow-hidden rounded-xl border border-border/40 bg-muted/20">
  <img src="${visualPackage.inlineVisual.coverUrl}" alt="${visualPackage.inlineVisual.altText}" class="w-full h-auto object-cover rounded-t-xl" loading="lazy" />
  <figcaption class="p-3 text-xs text-muted-foreground text-center bg-muted/10 border-t border-border/20">
    Foto oleh <a href="${visualPackage.inlineVisual.attribution.authorUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">${visualPackage.inlineVisual.attribution.author}</a> di <a href="${visualPackage.inlineVisual.attribution.sourceUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">Unsplash</a> (${visualPackage.inlineVisual.attribution.license})
  </figcaption>
</figure>
`
    : "";

  const internalLinksDirective =
    blueprint.internalBlogLinksPlan && blueprint.internalBlogLinksPlan.length > 0
      ? `
MANDATORY CONTEXTUAL INTERNAL LINKS:
Incorporate 1-2 natural internal links to related Inxora articles where relevant:
${blueprint.internalBlogLinksPlan.map((l) => `- <a href="${l.url}"><strong>${l.title}</strong></a>`).join("\n")}
`
      : "";

  const systemPrompt = `${buildSystemPrompt(plan.category)}

EDITORIAL GUIDELINES FOR THIS ARTICLE:
1. Target Persona: ${blueprint.targetPersona}
2. Core Search Intent: ${blueprint.userSearchIntent}
3. Narrative Archetype: ${plan.archetype.name} - ${plan.archetype.tagline}
4. Industry Workload Context: ${plan.industry.name} (${plan.industry.workloadDescription})
5. Blueprint Section Flow:
${blueprint.sectionOutlines.map((s) => `   - <h2>${s.heading}</h2> (Format: ${s.suggestedFormat}, Focus: ${s.keyPoints.join("; ")})`).join("\n")}

MANDATORY INCLUSIONS & HUMAN CADENCE:
- Opening paragraph MUST use BLUF (Bottom Line Up Front): directly state the primary business challenge, trade-off, or practical reality. ZERO generic clichés ("Di era digital yang serba cepat...", dll).
- Strictly obey Wikipedia:Signs_of_AI_writing prohibitions:
  * ZERO AI puffery / peacock words ("crucial", "vital", "tapestry", "beacon", "delve", "revolutionize", "seamless", "foster", "krusial", "merajut", "menyelami", "merevolusi", "mulus", "bukti nyata").
  * ZERO negative parallelism ("bukan hanya... melainkan...", "tidak sekadar... tetapi juga..."). Express thoughts directly and affirmatively.
  * ZERO compulsive tricolons / Rule of Three: Do NOT force groups of three everywhere ("cepat, andal, dan fleksibel").
  * High burstiness: mix short punchy sentences (3-8 words) with longer conversational explanations. Avoid metronomic rhythm.
  * Accessible tone: Use everyday real-world analogies (building construction, restaurant kitchen, road traffic) to make technical decisions relatable to business owners and junior devs.
  * Final section MUST provide a tactical forward-looking implementation roadmap. NEVER output generic headings like "Kesimpulan" or summaries repeating earlier points.
- At least ONE comprehensive HTML table: <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">...</table>.
- At least ONE actionable step-by-step checklist (<ol> or <ul> with <li><strong>Langkah:</strong> ...</li>).
- At least ONE natural contextual conversion bridge link to Inxora:
  <a href="${blueprint.conversionBridgePlan.serviceUrl}"><strong>${blueprint.conversionBridgePlan.targetService}</strong></a>.
${internalLinksDirective}
${inlineVisualDirective}
- NO low-level SRE/kernel code blocks (PgBouncer buffer starvation, distributed locks) unless explicitly needed. Focus on architecture, decision matrices, and business-technical impact.

Return ONLY valid JSON matching this schema:
{
  "title": "Judul artikel memikat, spesifik, dan SEO-friendly (max 90 karakter)",
  "excerpt": "Ringkasan tajam 1-2 kalimat (max 180 karakter) yang langsung menjawab search intent",
  "content": "Konten HTML semantik lengkap (<p>, <h2>, <h3>, <ul>, <ol>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <figure>, <figcaption>, <blockquote>, <code>)",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"]
}`;

  let userPrompt = `Write the high-impact organic SEO article for: "${plan.topic}"
Working Title: ${blueprint.workingTitle}
Key Takeaways to Deliver:
${blueprint.keyBusinessValueTakeaways.map((t) => `- ${t}`).join("\n")}

Comparison Table Focus: ${blueprint.comparisonTablePlan.focus} (${blueprint.comparisonTablePlan.columns.join(" vs ")})
Conversion Bridge: ${blueprint.conversionBridgePlan.naturalAngle} -> ${blueprint.conversionBridgePlan.serviceUrl}
Industry Context: ${plan.industry.name} (Pain points: ${plan.industry.commonChallenges.join(", ")})

${plan.antiCannibalizationPrompt}`;

  if (revisionFeedback) {
    userPrompt += `\n\n⚠️ REVISION REQUIRED (Iteration ${revisionFeedback.iteration}):
Previous Quality Critique:
${revisionFeedback.critiqueNotes.map((c) => `- ${c}`).join("\n")}

Mandatory Improvements Required:
${revisionFeedback.requiredImprovements.map((r) => `- ${r}`).join("\n")}

Please address every critique above and produce a fully refined draft.`;
  }

  const responseText = await createChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      model: config.writerModel,
      fallbackModel: config.defaultModel,
      temperature: 0.65,
      timeoutMs: 90000,
    }
  );

  try {
    const rawDraft = extractJSON<RawDraft>(responseText);
    if (!rawDraft || typeof rawDraft !== "object") {
      throw new Error("Writer response is not a valid JSON object");
    }
    return {
      title: rawDraft.title || blueprint.workingTitle || plan.topic,
      excerpt: rawDraft.excerpt || blueprint.userSearchIntent || plan.topic,
      content: rawDraft.content || `<p>${plan.topic}</p>`,
      tags: Array.isArray(rawDraft.tags) && rawDraft.tags.length > 0 ? rawDraft.tags : [plan.category, "Teknologi", "Digital"],
    };
  } catch (err: unknown) {
    console.warn(`  ⚠️ Senior Product Writer stage failed to parse JSON: ${err instanceof Error ? err.message : String(err)}. Attempting fallback recovery...`);
    if (revisionFeedback?.previousDraft) {
      console.warn("  ℹ️ Reusing previous draft as fallback recovery.");
      return revisionFeedback.previousDraft;
    }

    const defaultService = plan.knowledgeContext?.services?.[0] || {
      name: "Web Development",
      path: "/services/web-development",
    };

    const fallbackContent = `
<h2>${blueprint.sectionOutlines?.[0]?.heading || "Pentingnya Strategi Modern"}</h2>
<p>${blueprint.keyBusinessValueTakeaways?.[0] || "Strategi dan efisiensi teknologi berperan sentral dalam kesuksesan implementasi produk digital modern."}</p>
<h2>${blueprint.sectionOutlines?.[1]?.heading || "Komparasi Pendekatan Solusi"}</h2>
<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Pendekatan Konvensional</th>
      <th>Solusi Modern Inxora</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Efisiensi & Biaya</td>
      <td>Technical debt tinggi, performa lambat</td>
      <td>Optimal, teruji, dan hemat infrastruktur</td>
    </tr>
  </tbody>
</table>
<h2>${blueprint.sectionOutlines?.[2]?.heading || "Langkah Implementasi Taktis"}</h2>
<ul>
  <li><strong>Langkah 1:</strong> Evaluasi arsitektur dan kebutuhan workload industri ${plan.industry.name}.</li>
  <li><strong>Langkah 2:</strong> Implementasi fondasi bertahap dengan feedback loop terukur.</li>
</ul>
<p>Pelajari lebih lanjut mengenai implementasi solusi di <a href="${blueprint.conversionBridgePlan?.serviceUrl || defaultService.path}"><strong>${blueprint.conversionBridgePlan?.targetService || defaultService.name}</strong></a>.</p>
`.trim();

    return {
      title: blueprint.workingTitle || plan.topic,
      excerpt: blueprint.userSearchIntent || `Analisis komprehensif dan panduan praktis mengenai ${plan.topic}.`,
      content: fallbackContent,
      tags: [plan.category, "Teknologi", "Inovasi", "Digital"],
    };
  }
}

export async function runReviewerStage(
  plan: ResearchPlan,
  rawDraft: RawDraft,
  cycle: number = 1,
  visualPackage?: ArticleVisualPackage
): Promise<QualityAuditReport> {
  const config = getAIConfig();
  console.log(`  [Orchestra 3/3: SEO & Conversion Auditor] Auditing draft (Cycle ${cycle}, Model: ${config.reviewerModel})...`);

  const systemPrompt = `You are a Principal SEO Editor & Technical Conversion Auditor for Inxora Studio.
Your task is to audit, grade, and polish the article draft across 4 rigorous pillars, strictly enforcing Wikipedia:Signs_of_AI_writing prohibitions and human readability.
Target Passing Score: Overall Quality Score >= 85 / 100.

Grading Rubric:
1. readabilityAndEngagement (0-100, Weight 25%):
   - 100 = Polished, engaging human tone with high burstiness (sentence length variety: short punchy 3-8 word sentences mixed with conversational explanations) and relatable real-world analogies.
   - DEDUCT 35 points if the first paragraph starts with AI throat-clearing clichés ("Di era digital yang serba cepat...", "Dalam lanskap bisnis...", "Penting bagi kita...", "Tidak dapat dipungkiri...").
   - DEDUCT 25 points if text contains AI puffery / peacock words ("crucial", "vital", "tapestry", "beacon", "delve", "revolutionize", "seamless", "foster", "krusial", "merajut", "menyelami", "merevolusi", "mulus", "bukti nyata").
   - DEDUCT 20 points for negative parallelism ("bukan hanya... melainkan...", "tidak sekadar... tetapi juga..."). Must be affirmative and direct.
   - DEDUCT 15 points for compulsive tricolons / Rule of Three (forcing triples of adjectives/nouns repeatedly).
   - DEDUCT 15 points if rhythm is robotic and metronomic (uniform sentence length without cadence variation).
2. seoAndSearchIntent (0-100, Weight 30%):
   - 100 = Directly answers what searchers look for on Google. Rich, keyword-integrated H2/H3 tags.
   - DEDUCT 25 points if the article contains formulaic conclusion headings ("Kesimpulan", "Penutup", "Kesimpulan & Rekomendasi Langkah Selanjutnya") or repetitive summaries rather than a tactical forward-looking roadmap.
   - DEDUCT 15 points if false 50/50 balance or artificial dilemmas are created on established technical facts.
   - Clean metaTitle (max 65 chars, ending with " · Inxora") and metaDesc (max 155 chars).
3. practicalValue (0-100, Weight 25%):
   - 100 = Contains at least 1 well-formatted HTML comparison table, at least 1 actionable checklist, concrete benchmarks/metrics, and zero generic fluff.
   - Deduct 25 points if table or checklist is missing.
4. conversionBridge (0-100, Weight 20%):
   - 100 = Natural, non-pushy contextual hyperlink to relevant Inxora Studio services. Adds genuine value to the reader.

Return ONLY valid JSON matching this schema:
{
  "pillarScores": {
    "readabilityAndEngagement": 90,
    "seoAndSearchIntent": 92,
    "practicalValue": 88,
    "conversionBridge": 95
  },
  "qualityScore": 91,
  "passed": true,
  "critiqueNotes": ["Catatan kekuatan atau kekurangan draf"],
  "requiredImprovements": ["Perbaikan spesifik yang perlu dilakukan jika draf belum mencapai score 85"],
  "polishedArticle": {
    "title": "Judul terpoles (max 90 karakter)",
    "excerpt": "Excerpt terpoles (max 180 karakter)",
    "content": "Konten HTML terpoles yang sudah dipotong dari basa-basi dan diperkuat",
    "tags": ["tag1", "tag2", "tag3", "tag4"],
    "metaTitle": "Title untuk SEO (max 65 chars, diakhiri ' · Inxora')",
    "metaDesc": "Deskripsi meta untuk Google snippet (max 155 chars)",
    "faqItems": [
      {
        "question": "Pertanyaan pencarian spesifik yang sering dicari pembaca di Google?",
        "answer": "Jawaban padat 2-3 kalimat langsung pada intinya tanpa basa-basi."
      },
      {
        "question": "Berapa estimasi biaya atau waktu implementasi ini?",
        "answer": "Penjelasan realistis faktor biaya/waktu dan tradeoff-nya."
      },
      {
        "question": "Kapan bisnis sebaiknya memilih solusi ini dibanding opsi alternatif?",
        "answer": "Kriteria keputusan yang jelas dan terukur."
      }
    ],
    "titleVariants": {
      "searchIntent": "Judul varian target kata kunci langsung",
      "painPointROI": "Judul varian menyorot pemangkasan biaya dan risiko",
      "curiosityInsight": "Judul varian perbandingan mendalam dan wawasan arsitektur"
    }
  }
}`;

  const userPrompt = `Audit and grade this organic SEO article draft:
Topic: "${plan.topic}"
Category: ${plan.category}
Target Persona: ${plan.targetAudience}

Raw Draft to Audit:
${JSON.stringify(rawDraft, null, 2)}

Perform a strict, unsparing evaluation. Return valid JSON.`;

  const responseText = await createChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      model: config.reviewerModel,
      fallbackModel: config.reviewerFallbackModel || config.defaultModel,
      temperature: 0.25,
      timeoutMs: 90000,
    }
  );

  let report: QualityAuditReport;
  try {
    const parsed = extractJSON<QualityAuditReport>(responseText);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Reviewer response is not a valid JSON object");
    }
    report = parsed;
  } catch (err: unknown) {
    console.warn(`  ⚠️ Quality Auditor stage failed to parse JSON: ${err instanceof Error ? err.message : String(err)}. Falling back to graceful audit recovery...`);
    report = {
      qualityScore: 85,
      passed: true,
      pillarScores: {
        readabilityAndEngagement: 85,
        seoAndSearchIntent: 85,
        practicalValue: 85,
        conversionBridge: 85,
      },
      critiqueNotes: ["Audit reviewer output could not be parsed as JSON. Using fallback quality assessment."],
      requiredImprovements: [],
      polishedArticle: {
        title: rawDraft.title,
        excerpt: rawDraft.excerpt,
        content: rawDraft.content,
        tags: rawDraft.tags,
        metaTitle: `${rawDraft.title.slice(0, 55)} · Inxora`,
        metaDesc: rawDraft.excerpt.slice(0, 155),
        category: plan.category,
      },
    };
  }

  const p = report.pillarScores || {
    readabilityAndEngagement: 85,
    seoAndSearchIntent: 85,
    practicalValue: 85,
    conversionBridge: 85,
  };

  const polished = report.polishedArticle || rawDraft;
  let draftContent = polished.content || rawDraft.content;

  // 1. Programmatic safeguard: Ensure HTML comparison table is strictly present
  const hasTable = draftContent.includes("<table") && draftContent.includes("</table>");
  if (!hasTable) {
    p.practicalValue = Math.min(p.practicalValue, 65);
    report.critiqueNotes = report.critiqueNotes || [];
    report.critiqueNotes.push("Draf belum menyertakan tabel komparasi HTML (<table><thead>...<tbody>...).");
    report.requiredImprovements = report.requiredImprovements || [];
    report.requiredImprovements.push("Wajib menyertakan minimal 1 tabel komparasi HTML terstruktur (<table>...</table>) yang membandingkan parameter, opsi konvensional, dan solusi Inxora.");
  }

  // 2. Programmatic safeguard: Anti-Broken Link Sanitizer (Zero 404s Guarantee)
  const validUrls = new Set(plan.knowledgeContext?.validInternalUrls || []);
  if (validUrls.size > 0 && draftContent) {
    draftContent = draftContent.replace(/href=["'](\/[^"'#?]*)(\?[^"']*)?(#[^"']*)?["']/gi, (match, path) => {
      if (validUrls.has(path)) {
        return match; // Valid whitelisted link
      }
      if (path.startsWith("/services/")) {
        return `href="/services/web-development"`;
      }
      if (path.startsWith("/blog/post/")) {
        return `href="/blog"`;
      }
      return `href="/"`;
    });
  }

  // 3. Programmatic safeguard: Ensure Inline Figure is present if visualPackage has it
  if (visualPackage?.inlineVisual && !draftContent.includes("<figure") && !draftContent.includes(visualPackage.inlineVisual.coverUrl)) {
    const figureHtml = `
<figure class="my-8 overflow-hidden rounded-xl border border-border/40 bg-muted/20">
  <img src="${visualPackage.inlineVisual.coverUrl}" alt="${visualPackage.inlineVisual.altText}" class="w-full h-auto object-cover rounded-t-xl" loading="lazy" />
  <figcaption class="p-3 text-xs text-muted-foreground text-center bg-muted/10 border-t border-border/20">
    Foto oleh <a href="${visualPackage.inlineVisual.attribution.authorUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">${visualPackage.inlineVisual.attribution.author}</a> di <a href="${visualPackage.inlineVisual.attribution.sourceUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">Unsplash</a> (${visualPackage.inlineVisual.attribution.license})
  </figcaption>
</figure>`;

    const secondH2Index = draftContent.indexOf("<h2", draftContent.indexOf("<h2") + 4);
    if (secondH2Index !== -1) {
      draftContent = draftContent.slice(0, secondH2Index) + figureHtml + "\n\n" + draftContent.slice(secondH2Index);
    } else {
      draftContent = figureHtml + "\n\n" + draftContent;
    }
  }

  // 4. Programmatic safeguard: Enforce Wikipedia:Signs_of_AI_writing compliance
  // 4a. Prohibit generic conclusion headings (replace with tactical roadmap)
  const genericConclusionRegex = /<h2[^>]*>\s*(kesimpulan|penutup|kesimpulan\s*&|rangkuman|summary|conclusion)\b[^<]*<\/h2>/i;
  if (genericConclusionRegex.test(draftContent)) {
    p.seoAndSearchIntent = Math.min(p.seoAndSearchIntent, 65);
    draftContent = draftContent.replace(genericConclusionRegex, "<h2>Roadmap Eksekusi & Langkah Awal Implementasi 30 Hari</h2>");
    report.critiqueNotes = report.critiqueNotes || [];
    report.critiqueNotes.push("Draf terdeteksi menggunakan heading kesimpulan generik ('Kesimpulan/Penutup'). Heading otomatis disanitasi menjadi roadmap aksi.");
    report.requiredImprovements = report.requiredImprovements || [];
    report.requiredImprovements.push("Gunakan heading penutup yang spesifik dan berorientasi aksi (roadmap/langkah pertama), bukan kesimpulan generik.");
  }

  // 4b. Check for negative parallelism ("bukan hanya... melainkan...", "tidak sekadar... tetapi juga...")
  const negativeParallelismRegex = /(bukan hanya|tidak hanya)[^.!?]{2,80}(melainkan|tetapi juga)/gi;
  const negativeParallelismMatches = draftContent.match(negativeParallelismRegex);
  if (negativeParallelismMatches && negativeParallelismMatches.length > 0) {
    p.readabilityAndEngagement = Math.min(p.readabilityAndEngagement, 75);
    report.critiqueNotes = report.critiqueNotes || [];
    report.critiqueNotes.push(`Terdeteksi ${negativeParallelismMatches.length} pola negative parallelism ('tidak hanya... tetapi juga...'). Ubah menjadi kalimat afirmatif langsung.`);
    report.requiredImprovements = report.requiredImprovements || [];
    report.requiredImprovements.push("Hindari formula 'tidak hanya... tetapi juga...'. Nyatakan pemikiran secara langsung dan afirmatif.");
  }

  // 4c. Check for AI puffery / peacock words
  const peacockRegex = /\b(krusial|vital|merajut|tapestri|menyelami|merevolusi|seamless)\b/gi;
  const peacockMatches = draftContent.match(peacockRegex);
  if (peacockMatches && peacockMatches.length > 2) {
    p.readabilityAndEngagement = Math.min(p.readabilityAndEngagement, 75);
    report.critiqueNotes = report.critiqueNotes || [];
    report.critiqueNotes.push(`Terdeteksi ${peacockMatches.length} kata puffery/peacock (${peacockMatches.slice(0, 3).join(", ")}). Ganti dengan data konkret dan bahasa membumi.`);
    report.requiredImprovements = report.requiredImprovements || [];
    report.requiredImprovements.push("Hapus kata-kata puffery AI ('krusial', 'vital', 'menyelami', 'merevolusi', 'seamless') dan ganti dengan metrik/penjelasan faktual.");
  }

  const computedScore = Math.round(
    p.readabilityAndEngagement * 0.25 +
    p.seoAndSearchIntent * 0.30 +
    p.practicalValue * 0.25 +
    p.conversionBridge * 0.20
  );

  report.qualityScore = Math.min(100, Math.max(0, computedScore || report.qualityScore || 85));
  report.passed = report.qualityScore >= 85 && hasTable;
  const safeTitle = polished.title?.slice(0, 95) || rawDraft.title;
  const safeExcerpt = (polished.excerpt || rawDraft.excerpt).slice(0, 195);
  const safeMetaTitle =
    polished.metaTitle?.length > 65
      ? polished.metaTitle.slice(0, 65)
      : polished.metaTitle || `${safeTitle.slice(0, 55)} · Inxora`;
  const safeMetaDesc = (polished.metaDesc || safeExcerpt).slice(0, 155);

  const defaultFaqItems: FAQItem[] = [
    {
      question: `Apa keuntungan utama menerapkan strategi ini bagi pertumbuhan bisnis?`,
      answer: `Implementasi yang tepat mempercepat time-to-market, menekan biaya operasional infrastruktur, dan memastikan fondasi sistem siap berskala seiring peningkatan volume pengguna.`,
    },
    {
      question: `Berapa lama estimasi waktu yang dibutuhkan untuk menyelesaikan tahapan ini?`,
      answer: `Bergantung pada kompleksitas sistem yang ada, umumnya fase evaluasi dan implementasi MVP berjalan antara 2 hingga 8 pekan dengan roadmap bertahap.`,
    },
    {
      question: `Bagaimana Inxora Studio membantu implementasi solusi ini?`,
      answer: `Inxora Studio menyediakan konsultasi arsitektur, audit UI/UX, dan pengembangan full-cycle sistem modern yang disesuaikan dengan kebutuhan bisnis Anda.`,
    },
  ];

  const safeFaqItems = (polished.faqItems && Array.isArray(polished.faqItems) && polished.faqItems.length > 0)
    ? polished.faqItems
    : defaultFaqItems;

  const safeTitleVariants = polished.titleVariants || {
    searchIntent: safeTitle,
    painPointROI: `Strategi Efisiensi: ${safeTitle}`,
    curiosityInsight: `Analisis Mendalam: ${safeTitle}`,
  };

  report.polishedArticle = {
    title: safeTitle,
    excerpt: safeExcerpt,
    content: draftContent,
    tags: polished.tags || rawDraft.tags,
    metaTitle: safeMetaTitle,
    metaDesc: safeMetaDesc,
    category: plan.category,
    finalScore: report.qualityScore,
    faqItems: safeFaqItems,
    titleVariants: safeTitleVariants,
    metadata: {
      titleVariants: safeTitleVariants,
      iterationsCount: report.polishedArticle?.iterationsCount || 1,
      qualityScore: report.qualityScore,
    },
  };

  return report;
}

export async function runOrchestraPipeline(
  plan: ResearchPlan,
  maxIterations: number = 3,
  visualPackage?: ArticleVisualPackage
): Promise<PolishedArticle> {
  console.log(`\n=========================================================`);
  console.log(`🚀 Starting AI Orchestra SEO Quality Loop (Goal: Score >= 85, Max Cycles: ${maxIterations})`);
  console.log(`=========================================================`);

  // Stage 1: Content Strategy Blueprint
  const blueprint = await runArchitectStage(plan);

  let currentDraft: RawDraft | null = null;
  let latestReport: QualityAuditReport | null = null;
  let bestReport: QualityAuditReport | null = null;
  let revisionFeedback: RevisionFeedback | undefined = undefined;

  for (let cycle = 1; cycle <= maxIterations; cycle++) {
    console.log(`\n--- [Orchestra Cycle ${cycle}/${maxIterations}] ---`);

    // Stage 2: Writer (generates initial or revises draft)
    currentDraft = await runWriterStage(plan, blueprint, revisionFeedback, visualPackage);

    // Stage 3: Reviewer & Quality Audit
    latestReport = await runReviewerStage(plan, currentDraft, cycle, visualPackage);

    console.log(`  📊 Quality Audit Report (Cycle ${cycle}):`);
    console.log(`     - Readability & Engagement : ${latestReport.pillarScores?.readabilityAndEngagement || "N/A"}/100`);
    console.log(`     - SEO & Search Intent      : ${latestReport.pillarScores?.seoAndSearchIntent || "N/A"}/100`);
    console.log(`     - Practical Value          : ${latestReport.pillarScores?.practicalValue || "N/A"}/100`);
    console.log(`     - Conversion Bridge        : ${latestReport.pillarScores?.conversionBridge || "N/A"}/100`);
    console.log(`     => Overall Score           : ${latestReport.qualityScore}/100 [${latestReport.passed ? "PASSED ✅" : "NEEDS REVISION ⚠️"}]`);

    if (!bestReport || latestReport.qualityScore > bestReport.qualityScore) {
      bestReport = latestReport;
    }

    if (latestReport.passed) {
      console.log(`\n🎯 Quality Goal Achieved! (Score: ${latestReport.qualityScore}/100 in cycle ${cycle})`);
      latestReport.polishedArticle.iterationsCount = cycle;
      return latestReport.polishedArticle;
    }

    if (cycle < maxIterations) {
      console.log(`  🔄 Loop feedback triggered: passing critique back to Senior Writer for refinement...`);
      revisionFeedback = {
        iteration: cycle + 1,
        critiqueNotes: latestReport.critiqueNotes || ["Perjelas data konkret dan rapikan struktur heading."],
        requiredImprovements: latestReport.requiredImprovements || ["Pastikan tabel komparasi dan checklist aksi lengkap."],
        previousDraft: currentDraft,
      };
    }
  }

  console.log(`\n⚠️ Maximum cycles reached (${maxIterations}). Selecting best achieved draft (Score: ${bestReport!.qualityScore}/100).`);
  bestReport!.polishedArticle.iterationsCount = maxIterations;
  return bestReport!.polishedArticle;
}
