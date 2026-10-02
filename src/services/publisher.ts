import { z } from "zod";

export interface ImageAttribution {
  author?: string;
  authorUrl?: string;
  source?: string;
  sourceUrl?: string;
  license?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface IngestPayload {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage: string;
  imageAttribution?: ImageAttribution;
  category: string;
  tags: string[];
  authorSlug?: string;
  status?: "DRAFT" | "PUBLISHED";
  metaTitle?: string;
  metaDesc?: string;
  readingTime?: number;
  faqItems?: FAQItem[];
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  post?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    author: string;
    url: string;
  };
  error?: string;
  message?: string;
}

export async function publishArticle(
  payload: IngestPayload,
  apiUrl = process.env.INXORA_API_URL || "http://localhost:3000/api/webhooks/content-ingest",
  secretToken = process.env.CONTENT_INGEST_SECRET || "inxora-content-ingest-secret-2026-secure"
): Promise<PublishResult> {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const details = data.fieldErrors
        ? JSON.stringify(data.fieldErrors)
        : data.message || data.error;
      return {
        success: false,
        error: `${data.error || `HTTP ${res.status}`}: ${details}`,
      };
    }

    return {
      success: true,
      post: data.post,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network failure connecting to Inxora API: ${message}`,
      message: `Network failure connecting to Inxora API: ${message}`,
    };
  }
}

export const ingestArticle = publishArticle;

export interface JobProgressUpdate {
  jobId: string;
  status?: "PENDING" | "RESEARCHING" | "WRITING" | "REVIEWING" | "COMPLETED" | "FAILED";
  progress?: number;
  currentStep?: string;
  articleSlug?: string;
  articleUrl?: string;
  error?: string;
}

export async function reportJobProgress(
  update: JobProgressUpdate,
  apiUrl = process.env.INXORA_API_URL || "http://localhost:3000/api/webhooks/content-ingest",
  secretToken = process.env.CONTENT_INGEST_SECRET || "inxora-content-ingest-secret-2026-secure"
): Promise<boolean> {
  if (!update.jobId) return false;
  try {
    const progressUrl = apiUrl.replace(/\/content-ingest\/?$/, "/engine-job-progress");
    const res = await fetch(progressUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretToken}`,
      },
      body: JSON.stringify(update),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const BroadcastApiResponseSchema = z.object({
  success: z.boolean().optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

export interface BroadcastNewsletterPost {
  title: string;
  excerpt?: string;
  slug: string;
  coverImage?: string;
  contentHtml?: string;
  subject?: string;
  postUrl?: string;
}

export interface BroadcastNewsletterResult {
  success: boolean;
  count?: number;
  error?: string;
}

export async function broadcastPublishedNewsletter(
  post: {
    title: string;
    excerpt?: string;
    slug: string;
    coverImage?: string;
    contentHtml?: string;
    subject?: string;
    postUrl?: string;
  },
  apiUrl = process.env.INXORA_API_URL || "http://localhost:3000",
  secretToken = process.env.CONTENT_INGEST_SECRET || "inxora-content-ingest-secret-2026-secure"
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const siteBaseUrl = (
      process.env.SITE_PUBLIC_URL ||
      (apiUrl.startsWith("http") ? apiUrl.replace(/\/api\/.*$/, "") : "http://localhost:3000")
    ).replace(/\/$/, "");
    const cleanSlug = post.slug.replace(/^\//, "").replace(/^blog\//, "");
    const postUrl = post.postUrl || `${siteBaseUrl}/blog/${cleanSlug}`;

    const targetUrl = apiUrl.endsWith("/api/newsletter/broadcast")
      ? apiUrl
      : `${apiUrl.replace(/\/api\/webhooks\/content-ingest\/?$/, "").replace(/\/$/, "")}/api/newsletter/broadcast`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretToken}`,
        "x-inxora-secret": secretToken,
      },
      body: JSON.stringify({
        title: post.title,
        subject: post.subject || `[Inxora Newsletter] ${post.title}`,
        excerpt: post.excerpt,
        postUrl,
        coverImage: post.coverImage,
        contentHtml: post.contentHtml,
      }),
    });

    const rawData: unknown = await res.json();
    const parsed = BroadcastApiResponseSchema.safeParse(rawData);
    const data = parsed.success ? parsed.data : {};

    if (!res.ok || !data.success) {
      const errorMsg = data.error || data.message || `HTTP ${res.status}`;
      console.warn(`⚠️ [Newsletter Hub] Broadcast dispatch failed: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.log(`[Newsletter Hub] Broadcast dispatched to ${data.count ?? 0} subscribers`);
    return {
      success: true,
      count: data.count,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ [Newsletter Hub] Broadcast network error: ${message}`);
    return {
      success: false,
      error: `Network failure connecting to Inxora Broadcast API: ${message}`,
    };
  }
}
