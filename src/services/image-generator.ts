import { INXORA_CATEGORIES } from "../config.js";

export interface ImageResult {
  coverUrl: string;
  altText: string;
  source: "prebuilt-asset" | "ai-generated";
}

export async function resolveCoverImage(
  topic: string,
  category: string
): Promise<ImageResult> {
  const categoryConfig = INXORA_CATEGORIES[category];
  const defaultPath = categoryConfig?.defaultCover || "/images/System_Architecture.png";

  return {
    coverUrl: defaultPath,
    altText: `Ilustrasi teknis arsitektur untuk artikel: ${topic} - Inxora Studio`,
    source: "prebuilt-asset",
  };
}

