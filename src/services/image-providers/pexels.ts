import { ImageResult } from "../image-generator.js";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

/**
 * Searches the Pexels API for commercial-license photos with strict deduplication guard.
 */
export async function searchPexelsApi(
  query: string,
  apiKey: string = process.env.PEXELS_API_KEY || "",
  usedImages: Set<string> = new Set()
): Promise<ImageResult | null> {
  if (!apiKey) return null;

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15`;
    const res = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as PexelsSearchResponse;
    if (!data.photos || data.photos.length === 0) {
      return null;
    }

    const photo = data.photos.find((p) => {
      const candidateUrl = p.src.large2x || p.src.large || p.src.landscape;
      return !usedImages.has(candidateUrl) && !usedImages.has(p.url);
    });

    if (!photo) return null;

    const coverUrl = photo.src.large2x || photo.src.large || photo.src.landscape;
    return {
      coverUrl,
      altText: photo.alt || `${query} visual — Inxora Studio`,
      source: "pexels-api" as ImageResult["source"],
      attribution: {
        author: photo.photographer,
        authorUrl: photo.photographer_url,
        source: "Pexels",
        sourceUrl: photo.url,
        license: "Pexels License (Free commercial use)",
      },
    };
  } catch (err) {
    console.warn(`    ⚠️ Pexels API search error:`, err);
    return null;
  }
}

