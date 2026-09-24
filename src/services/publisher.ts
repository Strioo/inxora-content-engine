export interface IngestPayload {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  authorSlug?: string;
  status?: "DRAFT" | "PUBLISHED";
  metaTitle?: string;
  metaDesc?: string;
  readingTime?: number;
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
    };
  }
}
