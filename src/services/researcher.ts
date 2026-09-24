import { INXORA_CATEGORIES } from "../config.js";

export interface ResearchPlan {
  topic: string;
  category: string;
  targetAudience: string;
  searchIntent: "Informational" | "Commercial" | "Technical Guide";
  coreProblem: string;
  informationGainAngle: string;
  recommendedKeywords: string[];
}

export function researchTopic(topic: string, explicitCategory?: string): ResearchPlan {
  const cleanTopic = topic.trim();
  const lower = cleanTopic.toLowerCase();

  // 1. Resolve category
  let category = explicitCategory;
  if (!category || !INXORA_CATEGORIES[category]) {
    if (lower.includes("ai") || lower.includes("llm") || lower.includes("agent") || lower.includes("machine learning")) {
      category = "Artificial Intelligence";
    } else if (lower.includes("design") || lower.includes("ui") || lower.includes("ux") || lower.includes("interface")) {
      category = "UI/UX & Product Design";
    } else if (lower.includes("react") || lower.includes("next") || lower.includes("frontend") || lower.includes("app dev")) {
      category = "Web & App Development";
    } else {
      category = "System Architecture & Cloud";
    }
  }

  const categoryConfig = INXORA_CATEGORIES[category];

  return {
    topic: cleanTopic,
    category,
    targetAudience: "Technical Founders, CTOs, and Senior Software Engineers",
    searchIntent: lower.includes("panduan") || lower.includes("cara") ? "Technical Guide" : "Informational",
    coreProblem: `Tantangan implementasi, skalabilitas, dan efisiensi biaya pada ${cleanTopic}.`,
    informationGainAngle:
      "Menyajikan arsitektur nyata dengan data benchmark, mitigasi bottleneck produksi, dan contoh implementasi kode teruji.",
    recommendedKeywords: [
      ...categoryConfig.keywords.slice(0, 4),
      cleanTopic.toLowerCase().replace(/[^\w\s]/g, ""),
    ],
  };
}

