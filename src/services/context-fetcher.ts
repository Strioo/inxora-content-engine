export interface InxoraServiceContext {
  name: string;
  slug: string;
  path: string;
  shortDescription: string;
  hero: string;
}

export interface InxoraPortfolioContext {
  title: string;
  slug: string;
  path: string;
  category: string;
  client?: string;
  subtitle?: string;
}

export interface InxoraPostContext {
  title: string;
  slug: string;
  path: string;
  category: string;
  tags: string[];
  excerpt?: string;
}

export interface InxoraKnowledgeContext {
  success: boolean;
  services: InxoraServiceContext[];
  portfolios: InxoraPortfolioContext[];
  existingPosts: InxoraPostContext[];
  validInternalUrls: string[];
  usedCoverImages?: string[];
}

const FALLBACK_CONTEXT: InxoraKnowledgeContext = {
  success: true,
  usedCoverImages: [],
  services: [
    {
      name: "Web Development",
      slug: "web-development",
      path: "/services/web-development",
      shortDescription: "Fast, accessible, SEO-ready websites built for measurable business growth.",
      hero: "Inxora Studio designs and develops fast, reliable websites.",
    },
    {
      name: "App Development",
      slug: "app-development",
      path: "/services/app-development",
      shortDescription: "Cross-platform mobile applications for iOS and Android.",
      hero: "Reliable mobile applications with responsive UI and offline resilience.",
    },
    {
      name: "System Architecture",
      slug: "system-architecture",
      path: "/services/system-architecture",
      shortDescription: "Scalable backend systems and cloud infrastructure.",
      hero: "High-throughput, resilient cloud architecture designed for scale.",
    },
    {
      name: "UI/UX Design",
      slug: "ui-ux-design",
      path: "/services/ui-ux-design",
      shortDescription: "Intuitive product design systems and user journey optimization.",
      hero: "Data-driven UI/UX design that boosts user engagement and retention.",
    },
    {
      name: "Managed Cloud Infrastructure & Hosting",
      slug: "managed-cloud-infrastructure-hosting",
      path: "/services/managed-cloud-infrastructure-hosting",
      shortDescription: "High-uptime, security-hardened managed cloud hosting.",
      hero: "Zero-downtime infrastructure operations for high-growth enterprises.",
    },
  ],
  portfolios: [],
  existingPosts: [],
  validInternalUrls: [
    "/",
    "/services",
    "/services/web-development",
    "/services/app-development",
    "/services/system-architecture",
    "/services/ui-ux-design",
    "/services/managed-cloud-infrastructure-hosting",
    "/portfolio",
    "/blog",
    "/contact",
    "/features/inxoralabs",
  ],
};

export async function fetchInxoraKnowledgeContext(
  apiUrl = process.env.INXORA_API_URL || "http://localhost:3000/api/webhooks/content-ingest",
  secretToken = process.env.CONTENT_INGEST_SECRET || "inxora-content-ingest-secret-2026-secure"
): Promise<InxoraKnowledgeContext> {
  // Convert ingest webhook URL to content-context URL
  const contextUrl = apiUrl.replace(/\/api\/webhooks\/content-ingest\/?$/, "/api/content-context");

  try {
    const res = await fetch(contextUrl, {
      headers: {
        Authorization: `Bearer ${secretToken}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.services) && Array.isArray(data.validInternalUrls)) {
        return data as InxoraKnowledgeContext;
      }
    }
    console.warn(`[ContextFetcher] Endpoint ${contextUrl} returned non-200. Using fallback context.`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[ContextFetcher] Unable to reach Inxora web context API (${message}). Using local fallback.`);
  }

  return FALLBACK_CONTEXT;
}

