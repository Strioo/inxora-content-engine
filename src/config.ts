export interface CategoryConfig {
  name: string;
  slug: string;
  defaultCover: string;
  keywords: string[];
}

export const INXORA_CATEGORIES: Record<string, CategoryConfig> = {
  "System Architecture & Cloud": {
    name: "System Architecture & Cloud",
    slug: "system-architecture-cloud",
    defaultCover: "/images/System_Architecture.png",
    keywords: [
      "cloud architecture",
      "system design",
      "microservices",
      "distributed systems",
      "scalability",
      "high availability",
      "docker",
      "kubernetes",
    ],
  },
  "Artificial Intelligence": {
    name: "Artificial Intelligence",
    slug: "artificial-intelligence",
    defaultCover: "/images/Ai_Technology.png",
    keywords: [
      "agentic ai",
      "llm",
      "machine learning",
      "automation",
      "rag pipeline",
      "ai workflow",
    ],
  },
  "Web & App Development": {
    name: "Web & App Development",
    slug: "web-app-development",
    defaultCover: "/images/Web_Development.png",
    keywords: [
      "next.js 16",
      "react 19",
      "typescript",
      "web engineering",
      "performance",
      "server actions",
      "api development",
    ],
  },
  "UI/UX & Product Design": {
    name: "UI/UX & Product Design",
    slug: "ui-ux-product-design",
    defaultCover: "/images/UI_UX_Design.png",
    keywords: [
      "design systems",
      "user experience",
      "accessibility",
      "product design",
      "wireframing",
      "conversion rate optimization",
    ],
  },
};

export const INXORA_SERVICES = [
  { name: "Web Development", path: "/services/web-development" },
  { name: "App Development", path: "/services/app-development" },
  { name: "System Architecture", path: "/services/system-architecture" },
  { name: "UI/UX Design", path: "/services/ui-ux-design" },
  {
    name: "Managed Cloud Infrastructure & Hosting",
    path: "/services/managed-cloud-infrastructure-hosting",
  },
];

export const INXORA_AUTHOR = {
  name: "Wahid Satrio Aji",
  slug: "wahid-satrio-aji",
  title: "Principal System Architect & Technical Lead",
};

