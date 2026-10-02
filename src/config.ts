export interface CategoryConfig {
  name: string;
  slug: string;
  defaultCover: string;
  keywords: string[];
}

export const INXORA_CATEGORIES: Record<string, CategoryConfig> = {
  "Web & App Development": {
    name: "Web & App Development",
    slug: "web-app-development",
    defaultCover: "/images/Web_Development.png",
    keywords: [
      "jasa pembuatan website",
      "web development bisnis",
      "next.js development",
      "aplikasi mobile modern",
      "website company profile",
      "toko online e-commerce",
      "optimasi kecepatan web",
      "biaya pembuatan website",
      "pembuatan aplikasi flutter",
      "pwa bisnis",
    ],
  },
  "UI/UX & Product Design": {
    name: "UI/UX & Product Design",
    slug: "ui-ux-product-design",
    defaultCover: "/images/UI_UX_Design.png",
    keywords: [
      "jasa desain ui ux",
      "redesign website",
      "desain landing page konversi tinggi",
      "conversion rate optimization",
      "audit pengalaman pengguna",
      "design system bisnis",
      "wireframe dan prototipe",
      "desain aplikasi mobile",
      "perbaikan bounce rate",
    ],
  },
  "System Architecture & Cloud": {
    name: "System Architecture & Cloud",
    slug: "system-architecture-cloud",
    defaultCover: "/images/System_Architecture.png",
    keywords: [
      "arsitektur cloud hemat biaya",
      "skalabilitas sistem bisnis",
      "hosting cloud terkelola",
      "migrasi sistem tanpa downtime",
      "keamanan data digital",
      "pemeliharaan web enterprise",
      "optimasi server vps",
    ],
  },
  "Artificial Intelligence": {
    name: "Artificial Intelligence",
    slug: "artificial-intelligence",
    defaultCover: "/images/Ai_Technology.png",
    keywords: [
      "pemanfaatan ai untuk bisnis",
      "otomasi alur kerja digital",
      "chatbot ai customer service",
      "implementasi llm praktis",
      "agentic ai operasional",
      "efisiensi biaya dengan ai",
      "integrasi api ai",
    ],
  },
};

export const INXORA_SERVICES = [
  {
    name: "Web Development",
    path: "/services/web-development",
    description: "Pembuatan website cepat, responsif, dan siap SEO untuk pertumbuhan bisnis terukur.",
  },
  {
    name: "App Development",
    path: "/services/app-development",
    description: "Pengembangan aplikasi web dan mobile dengan performa andal dan pengalaman pengguna mulus.",
  },
  {
    name: "UI/UX Design",
    path: "/services/ui-ux-design",
    description: "Desain antarmuka modern yang fokus pada kemudahan navigasi dan peningkatan konversi penjualan.",
  },
  {
    name: "System Architecture",
    path: "/services/system-architecture",
    description: "Perancangan arsitektur sistem digital yang scalable, hemat biaya cloud, dan tahan banting.",
  },
  {
    name: "Managed Cloud Infrastructure & Hosting",
    path: "/services/managed-cloud-infrastructure-hosting",
    description: "Pengelolaan server, cloud, dan infrastruktur hosting tanpa repot dengan uptime tinggi.",
  },
];

export const INXORA_AUTHOR = {
  name: "Wahid Satrio Aji",
  slug: "wahid-satrio-aji",
  title: "Principal Technology & Digital Product Consultant",
};

export type TopicResearchMode = "TREND_NEWS" | "GENERAL_EVERGREEN";

export const TOPIC_RESEARCH_MODES: readonly TopicResearchMode[] = [
  "TREND_NEWS",
  "GENERAL_EVERGREEN",
] as const;

export const DAEMON_DEFAULT_INTERVAL_DAYS = 3;
export const DAEMON_DEFAULT_WEEKLY_LIMIT = 3;
export const DAEMON_STATE_FILE_PATH = "data/daemon-state.json";
export const DAEMON_PUBLISH_STATUS: "DRAFT" | "PUBLISHED" =
  (process.env.DAEMON_PUBLISH_STATUS as "DRAFT" | "PUBLISHED") || "PUBLISHED";
