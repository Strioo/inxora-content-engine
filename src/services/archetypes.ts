export type ArchetypeId =
  | "war-story"
  | "deep-dive"
  | "benchmark-battle"
  | "production-blueprint"
  | "adr";

export interface ArchetypeDefinition {
  id: ArchetypeId;
  name: string;
  tagline: string;
  narrativeAngle: string;
  headingBlueprint: {
    h2Sections: string[];
    calloutTheme: string;
    codeFocus: string;
  };
  promptInstruction: string;
}

export type IndustryId =
  | "fintech"
  | "ecommerce"
  | "saas"
  | "iot-logistics"
  | "healthtech";

export interface IndustryContext {
  id: IndustryId;
  name: string;
  workloadDescription: string;
  typicalBottlenecks: string[];
  complianceOrEdgeCase: string;
  codeContextHint: string;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDefinition> = {
  "war-story": {
    id: "war-story",
    name: "The Post-Mortem & Incident Investigation",
    tagline: "Studi Kasus Insiden Produksi Nyata dan Rekayasa Pemulihannya",
    narrativeAngle:
      "Investigasi kronologis kegagalan sistem p99 latency spike, connection exhaustion, atau deadlock pada jam sibuk, diikuti root cause analysis dan mitigasi permanen.",
    headingBlueprint: {
      h2Sections: [
        "1. Kronologi Insiden: Anomali Metrik pada Beban Puncak",
        "2. Investigasi Root Cause: Mengapa Failover Biasa Tidak Cukup",
        "3. Solusi Rekayasa dan Implementasi Proteksi",
        "4. Post-Mortem dan Aturan Pencegahan Permanen",
      ],
      calloutTheme: "Analisis Kegagalan (Post-Mortem Insight)",
      codeFocus: "Circuit breaker, fallback strategy, query timeout protection",
    },
    promptInstruction:
      "Tulis dengan gaya investigasi teknis insiden produksi (War Story / Post-Mortem). Awali langsung dengan kronologi kejadian anomali metrik secara tajam tanpa basa-basi. Sajikan tabel timeline kejadian dan kode mitigasi defensif.",
  },
  "deep-dive": {
    id: "deep-dive",
    name: "Architectural Deep-Dive & Internals",
    tagline: "Membedah Mekanisme Internal dan Jeroan Sistem di Lapisan Bawah",
    narrativeAngle:
      "Eksplorasi mendalam mengenai cara kerja low-level atau arsitektur inti dari teknologi terkait, membongkar asumsi umum yang salah, dan mengungkap trade-offs.",
    headingBlueprint: {
      h2Sections: [
        "1. Dekonstruksi Mekanisme Internal dan Asumsi Keliru",
        "2. Visualisasi Aliran Data dan Trade-Off Arsitektural",
        "3. Implementasi Pola Tingkat Lanjut di Produksi",
        "4. Checklist Evaluasi Kapasitas dan Batas Skalabilitas",
      ],
      calloutTheme: "Prinsip Arsitektur (Architectural Invariant)",
      codeFocus: "Custom pooling, atomic locking, low-level configuration",
    },
    promptInstruction:
      "Tulis dengan gaya Deep-Dive Arsitektural tingkat lanjut. Bedah jeroan internal teknologi secara presisi, bandingkan mekanisme write path vs read path, dan sajikan implementasi kode yang efisien memori.",
  },
  "benchmark-battle": {
    id: "benchmark-battle",
    name: "Pragmatic Benchmark & Tech Evaluation",
    tagline: "Komparasi Head-to-Head Objektif: Kapan Harus Pindah?",
    narrativeAngle:
      "Evaluasi komparatif yang pragmatis dan empiris antara dua pendekatan teknis bersaing, menimbang performa throughput, latensi p99, dan beban kognitif tim.",
    headingBlueprint: {
      h2Sections: [
        "1. Premis Komparasi: Hipotesis vs Kenyataan di Lapangan",
        "2. Matriks Pengujian Empiris: Throughput, Latensi, dan Resource",
        "3. Skenario Nyata: Kapan Menggunakan Solusi A vs Solusi B",
        "4. Pola Implementasi Transisi Tanpa Downtime",
      ],
      calloutTheme: "Hukum Kompromi (Trade-Off Axiom)",
      codeFocus: "Benchmark harness, adapter pattern, dual-write mitigation",
    },
    promptInstruction:
      "Tulis dengan format evaluasi teknis objektif (Benchmark Battle). Sajikan tabel perbandingan empiris menyeluruh, bedah skenario kapan memilih masing-masing pendekatan, dan berikan contoh kode adapter/transisi.",
  },
  "production-blueprint": {
    id: "production-blueprint",
    name: "Hands-on Production Blueprint",
    tagline: "Cetak Biru Implementasi Siap Produksi Tahan Banting",
    narrativeAngle:
      "Panduan praktis implementasi kode ujung-ke-ujung yang dirancang untuk lingkungan produksi dengan fokus utama pada idempotensi, retry backoff, dan observabilitas.",
    headingBlueprint: {
      h2Sections: [
        "1. Prasyarat Arsitektural dan Pemodelan Kontrak",
        "2. Implementasi Inti dengan Proteksi Edge Cases",
        "3. Pola Idempotensi, Telemetry, dan Structured Logging",
        "4. Verifikasi Ketahanan Beban dan Chaos Engineering",
      ],
      calloutTheme: "Standar Produksi (Production Hardening)",
      codeFocus: "Idempotent handler, distributed lock, telemetry tracing",
    },
    promptInstruction:
      "Tulis dengan format Production Blueprint siap pakai. Berikan implementasi kode lengkap dengan penanganan error kasus ekstrem, idempotensi, retry dengan jitter, dan observabilitas.",
  },
  adr: {
    id: "adr",
    name: "Architectural Decision Record (ADR)",
    tagline: "Rekam Jejak Keputusan Arsitektur: Alasan di Balik Pilihan Rekayasa",
    narrativeAngle:
      "Format formal keputusan tim engineering senior: latar belakang masalah bisnis, alternatif yang dievaluasi, alasan kuat mengapa opsi lain ditolak, dan konsekuensi jangka panjang.",
    headingBlueprint: {
      h2Sections: [
        "1. Konteks Bisnis dan Masalah Teknis yang Dihadapi",
        "2. Alternatif yang Dievaluasi dan Alasan Penolakan",
        "3. Keputusan Terpilih dan Rationale Rekayasa",
        "4. Konsekuensi Positif, Negatif, dan Mitigasi Risiko",
      ],
      calloutTheme: "Keputusan Arsitektur (Decision Rationale)",
      codeFocus: "Clean boundary interface, abstraction isolation",
    },
    promptInstruction:
      "Tulis dengan format Architectural Decision Record (ADR) profesional. Urai konteks masalah, bandingkan alternatif solusi yang dieliminasi, jelaskan mengapa solusi terpilih paling optimal, dan sertakan contoh kode boundary.",
  },
};

export const INDUSTRIES: Record<IndustryId, IndustryContext> = {
  fintech: {
    id: "fintech",
    name: "FinTech & Payment Gateway",
    workloadDescription:
      "Pemrosesan transaksi finansial dengan nol toleransi inkonsistensi saldo (zero double-spending), audit trail immutability, dan kepatuhan PCI-DSS.",
    typicalBottlenecks: [
      "Deadlock pada update balance concurrent",
      "Duplikasi callback payment gateway",
      "Latensi p99 pada validasi fraud score",
    ],
    complianceOrEdgeCase:
      "Idempotency token wajib pada setiap mutasi ledger; transaksi harus ACID compliant.",
    codeContextHint:
      "Contoh kode harus mendemonstrasikan proteksi transaksi atomik atau penanganan idempotensi request transfer dana.",
  },
  ecommerce: {
    id: "ecommerce",
    name: "High-Traffic Flash Sale E-Commerce",
    workloadDescription:
      "Lonjakan trafik 10x-50x secara instan pada event penjualan kilat, perebutan stok inventaris terbatas, dan lonjakan checkout concurrency.",
    typicalBottlenecks: [
      "Overselling akibat race condition pada stok inventaris",
      "Database connection exhaustion saat banner promo tayang",
      "Cache stampede pada katalog produk populer",
    ],
    complianceOrEdgeCase:
      "Multi-tier cache (memory + Redis) dengan probabilistic early expiration; decrement stok via Redis atomic script sebelum persist ke database.",
    codeContextHint:
      "Contoh kode harus mendemonstrasikan penanganan stok atomik atau proteksi cache stampede.",
  },
  saas: {
    id: "saas",
    name: "Multi-Tenant Enterprise SaaS & AI Pipeline",
    workloadDescription:
      "Arsitektur multi-tenant dengan isolasi data antar organisasi, integrasi LLM streaming, dan mitigasi rate-limit provider eksternal.",
    typicalBottlenecks: [
      "Noisy neighbor problem (satu tenant menghabiskan resource pool)",
      "Timeout pada LLM token streaming pipeline",
      "Kebocoran konteks antar tenant di lapisan caching",
    ],
    complianceOrEdgeCase:
      "Tenant schema isolation / Row-Level Security (RLS) serta client-side backpressure pada streaming response.",
    codeContextHint:
      "Contoh kode harus mendemonstrasikan tenant contextual isolation atau stream consumer dengan rate limiter.",
  },
  "iot-logistics": {
    id: "iot-logistics",
    name: "Real-time Logistics & IoT Telemetry",
    workloadDescription:
      "Penerimaan stream jutaan sinyal lokasi dan sensor kendaraan per detik, partisi time-series, dan pemrosesan geofencing real-time.",
    typicalBottlenecks: [
      "Write amplification pada database relational",
      "Out-of-order event delivery pada jaringan seluler tidak stabil",
      "Consumer lag pada streaming queue",
    ],
    complianceOrEdgeCase:
      "Batch ingestion dengan dead-letter queue; time-bucketed compaction untuk data historis.",
    codeContextHint:
      "Contoh kode harus mendemonstrasikan batch processor atau dedup window untuk event time-series.",
  },
  healthtech: {
    id: "healthtech",
    name: "HealthTech & Telemedicine Platform",
    workloadDescription:
      "Platform rekam medis elektronik terdistribusi, enkripsi end-to-end data pasien, dan streaming konsultasi real-time.",
    typicalBottlenecks: [
      "Beban enkripsi field-level pada query agregasi data medis",
      "Ketersediaan tinggi (99.99%) untuk sistem triase darurat",
      "Audit trail immutable untuk akses data sensitif",
    ],
    complianceOrEdgeCase:
      "Kepatuhan regulasi privasi data kesehatan; tokenisasi data identitas personal (PII) sebelum disimpan.",
    codeContextHint:
      "Contoh kode harus mendemonstrasikan audit logger immutable atau field-level encryption middleware.",
  },
};

export function getRandomArchetype(): ArchetypeDefinition {
  const keys = Object.keys(ARCHETYPES) as ArchetypeId[];
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return ARCHETYPES[randomKey];
}

export function getRandomIndustry(): IndustryContext {
  const keys = Object.keys(INDUSTRIES) as IndustryId[];
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return INDUSTRIES[randomKey];
}

