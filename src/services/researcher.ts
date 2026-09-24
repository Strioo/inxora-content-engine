import { INXORA_CATEGORIES } from "../config.js";
import {
  ArchetypeDefinition,
  IndustryContext,
  ARCHETYPES,
  INDUSTRIES,
  getRandomArchetype,
  getRandomIndustry,
  ArchetypeId,
  IndustryId,
} from "./archetypes.js";
import {
  ArticleHistoryItem,
  fetchRecentArticles,
  buildAntiCannibalizationPrompt,
} from "./history-guard.js";

export interface ResearchPlan {
  topic: string;
  category: string;
  targetAudience: string;
  searchIntent: "Informational" | "Commercial" | "Technical Guide";
  coreProblem: string;
  informationGainAngle: string;
  recommendedKeywords: string[];
  archetype: ArchetypeDefinition;
  industry: IndustryContext;
  existingArticles: ArticleHistoryItem[];
  antiCannibalizationPrompt: string;
}

export function researchTopic(topic: string, explicitCategory?: string): ResearchPlan {
export interface ResearchOptions {
  category?: string;
  archetype?: string;
  industry?: string;
}

export async function researchTopic(
  topic: string,
  options: ResearchOptions = {}
): Promise<ResearchPlan> {
  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();

  // 1. Resolve category
  let category = explicitCategory;
  let category = options.category;
  if (!category || !INXORA_CATEGORIES[category]) {
    if (lower.includes("ai") || lower.includes("llm") || lower.includes("agent") || lower.includes("machine learning")) {
    if (
      lower.includes("ai") ||
      lower.includes("llm") ||
      lower.includes("agent") ||
      lower.includes("machine learning")
    ) {
      category = "Artificial Intelligence";
    } else if (lower.includes("design") || lower.includes("ui") || lower.includes("ux") || lower.includes("interface")) {
    } else if (
      lower.includes("design") ||
      lower.includes("ui") ||
      lower.includes("ux") ||
      lower.includes("interface")
    ) {
      category = "UI/UX & Product Design";
    } else if (lower.includes("react") || lower.includes("next") || lower.includes("frontend") || lower.includes("app dev")) {
    } else if (
      lower.includes("react") ||
      lower.includes("next") ||
      lower.includes("frontend") ||
      lower.includes("app dev")
    ) {
      category = "Web & App Development";
    } else {
      category = "System Architecture & Cloud";
    }
  }

  const categoryConfig = INXORA_CATEGORIES[category];

  // 2. Resolve Archetype (manual override or smart random rotation)
  let archetype: ArchetypeDefinition;
  if (options.archetype && ARCHETYPES[options.archetype as ArchetypeId]) {
    archetype = ARCHETYPES[options.archetype as ArchetypeId];
  } else {
    archetype = getRandomArchetype();
  }

  // 3. Resolve Industry Context (manual override or smart random rotation)
  let industry: IndustryContext;
  if (options.industry && INDUSTRIES[options.industry as IndustryId]) {
    industry = INDUSTRIES[options.industry as IndustryId];
  } else {
    industry = getRandomIndustry();
  }

  // 4. Fetch History & Build Anti-Cannibalization Guard
  const existingArticles = await fetchRecentArticles();
  const antiCannibalizationPrompt = buildAntiCannibalizationPrompt(existingArticles);

  return {
    topic: cleanTopic,
    category,
    targetAudience: "Technical Founders, CTOs, and Senior Software Engineers",
    searchIntent: lower.includes("panduan") || lower.includes("cara") ? "Technical Guide" : "Informational",
    coreProblem: `Tantangan implementasi, skalabilitas, dan efisiensi biaya pada ${cleanTopic}.`,
    informationGainAngle:
      "Menyajikan arsitektur nyata dengan data benchmark, mitigasi bottleneck produksi, dan contoh implementasi kode teruji.",
    searchIntent:
      lower.includes("panduan") || lower.includes("cara")
        ? "Technical Guide"
        : "Informational",
    coreProblem: `Tantangan implementasi, skalabilitas, dan keandalan sistem pada ${cleanTopic} dalam industri ${industry.name}.`,
    informationGainAngle: `${archetype.narrativeAngle} dengan studi kasus ${industry.name}.`,
    recommendedKeywords: [
      ...categoryConfig.keywords.slice(0, 4),
      ...categoryConfig.keywords.slice(0, 3),
      industry.name.toLowerCase().split(" ")[0],
      cleanTopic.toLowerCase().replace(/[^\w\s]/g, ""),
    ],
    archetype,
    industry,
    existingArticles,
    antiCannibalizationPrompt,
  };
}

