export type ArchetypeId =
  | "practical-guide"
  | "strategic-comparison"
  | "problem-solver-checklist"
  | "business-innovation-insight"
  | "cost-and-roi-blueprint";

export interface ArchetypeDefinition {
  id: ArchetypeId;
  name: string;
  tagline: string;
  narrativeAngle: string;
  headingBlueprint: {
    h2Sections: string[];
    calloutTheme: string;
    focusElement: string;
  };
  promptInstruction: string;
}

export type IndustryId =
  | "sme-retail"
  | "b2b-saas"
  | "corporate-services"
  | "health-wellness"
  | "education-edutech";

export interface IndustryContext {
  id: IndustryId;
  name: string;
  workloadDescription: string;
  commonChallenges: string[];
  keyBusinessGoals: string;
  conversionContext: string;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDefinition> = {
  "practical-guide": {
    id: "practical-guide",
    name: "The Definitive Practical Guide",
    tagline: "Panduan Langkah demi Langkah Menyelesaikan Kebutuhan Digital Bisnis",
    narrativeAngle:
      "Membimbing pembaca dari pemahaman masalah mendasar hingga eksekusi solusi siap pakai, dilengkapi tahapan terstruktur, perbandingan opsi, dan checklist praktis.",
    headingBlueprint: {
      h2Sections: [
        "Dampak Nyata terhadap Efisiensi dan Pertumbuhan Bisnis",
        "Konsep Kunci & Komponen yang Wajib Dipahami",
        "Langkah demi Langkah Implementasi yang Teruji",
        "Kesalahan Umum yang Harus Dihindari & Tips Optimasi",
        "Roadmap Eksekusi & Langkah Awal Implementasi 30 Hari",
      ],
      calloutTheme: "Tips Praktis Inxora Studio",
      focusElement: "Langkah terstruktur, tabel komparasi opsi, dan checklist aksi",
    },
    promptInstruction:
      "Tulis dengan gaya Panduan Lengkap (The Definitive Guide). Buka langsung dengan urgensi masalah bisnis nyata tanpa klise pembuka. Gunakan bahasa yang membumi bagi founders dan manajer produk, sertakan tabel komparasi yang objektif, dan berikan langkah aksi konkret. Hindari kata-kata megah berlebihan (peacock words), trikolon klise, dan kesimpulan generik. Gunakan ritme kalimat dinamis dan analogi nyata yang mudah dipahami.",
  },

  "strategic-comparison": {
    id: "strategic-comparison",
    name: "Strategic Evaluation & Comparison Matrix",
    tagline: "Matriks Evaluasi Kritis & Perbandingan Opsi Solusi Digital",
    narrativeAngle:
      "Membandingkan dua atau lebih pendekatan secara objektif dari sudut pandang biaya, kemudahan skalabilitas, waktu rilis, dan kemudahan pemeliharaan jangka panjang.",
    headingBlueprint: {
      h2Sections: [
        "Dilema Pemilihan Solusi bagi Pembuat Keputusan",
        "Matriks Komparasi Parameter Utama & Trade-Off",
        "Kapan Harus Memilih Opsi A vs Opsi B",
        "Studi Kelayakan Biaya & Total Cost of Ownership (TCO)",
        "Panduan Keputusan & Skenario Penerapan Berbasis Kebutuhan",
      ],
      calloutTheme: "Evaluasi Trade-Off",
      focusElement: "Tabel perbandingan terperinci dan panduan kriteria pemilihan",
    },
    promptInstruction:
      "Tulis dengan gaya Evaluasi & Komparasi Strategis. Sajikan tabel perbandingan menyeluruh antara pendekatan konvensional vs modern, analisislah keuntungan dan batas kemampuan masing-masing secara objektif. Hindari perbandingan simetris 50/50 yang dibuat-buat jika satu pendekatan secara teknis memang lebih superior untuk kebutuhan modern. Berikan rekomendasi berbasis use-case bisnis nyata tanpa bahasa berlebihan.",
  },

  "problem-solver-checklist": {
    id: "problem-solver-checklist",
    name: "Problem Solver & Diagnostic Checklist",
    tagline: "Diagnostik Masalah Kritis & Checklist Perbaikan Langsung",
    narrativeAngle:
      "Mendiagnosis akar penyebab dari gejala masalah bisnis/teknis (seperti website lambat, drop-off checkout tinggi, atau aplikasi sering crash) dan memberikan checklist audit yang dapat segera dieksekusi.",
    headingBlueprint: {
      h2Sections: [
        "Gejala dan Dampak Finansial dari Masalah Ini",
        "Akar Penyebab yang Sering Terabaikan",
        "Checklist Diagnostik & Audit Langkah demi Langkah",
        "Solusi Perbaikan Cepat vs Solusi Jangka Panjang",
        "Prosedur Monitoring & Langkah Pencegahan Masalah Berulang",
      ],
      calloutTheme: "Diagnostik Cepat Inxora",
      focusElement: "Checklist audit interaktif dan prioritas penanganan masalah",
    },
    promptInstruction:
      "Tulis dengan gaya Pemecah Masalah & Checklist Diagnostik. Mulai langsung dengan dampak finansial atau friksi operasional nyata tanpa pembuka klise. Berikan checklist bernomor urut logis dan solusi perbaikan nyata yang dapat langsung dieksekusi. Hindari negative parallelism ('bukan hanya... melainkan...'), jargon tanpa penjelasan, dan repetisi transisi.",
  },

  "business-innovation-insight": {
    id: "business-innovation-insight",
    name: "Business & Technology Innovation Insight",
    tagline: "Membedah Tren Teknologi Terkini & Peluang Keunggulan Kompetitif",
    narrativeAngle:
      "Menjelaskan bagaimana teknologi mutakhir (seperti AI otomasi, arsitektur headless modern, atau strategi UI/UX berbasis data) dapat dimanfaatkan untuk memenangkan persaingan pasar.",
    headingBlueprint: {
      h2Sections: [
        "Perubahan Perilaku Pengguna & Dinamika Industri",
        "Peluang Efisiensi Baru dari Pemanfaatan Teknologi Modern",
        "Studi Skenario Implementasi Nyata pada Bisnis",
        "Tantangan Adopsi & Mitigasi Risiko Eksekusi",
        "Peta Jalan Adopsi & Pengukuran Dampak Bisnis",
      ],
      calloutTheme: "Wawasan Inovasi Bisnis",
      focusElement: "Skenario use-case bisnis, timeline tahapan, dan proyeksi dampak",
    },
    promptInstruction:
      "Tulis dengan gaya Wawasan Inovasi Bisnis (Innovation Insight). Sajikan perspektif pragmatis dan membumi. Jelaskan bagaimana teknologi modern menyelesaikan friksi bisnis nyata dengan angka terukur, bukan sekadar hype atau jargon visioner (hindari 'merevolusi', 'tapestry', 'game-changer'). Gunakan analogi operasional yang mudah dipahami pembaca non-teknis.",
  },

  "cost-and-roi-blueprint": {
    id: "cost-and-roi-blueprint",
    name: "Cost Optimization & ROI Blueprint",
    tagline: "Perencanaan Anggaran, Optimasi Biaya, dan Pengukuran ROI Digital",
    narrativeAngle:
      "Memberikan panduan transparan mengenai estimasi biaya, alokasi anggaran pengembangan, dan formula menghitung pengembalian investasi (ROI) dari proyek digital.",
    headingBlueprint: {
      h2Sections: [
        "Realitas Biaya Pengembangan & Risiko Hidden Cost",
        "Komponen Alokasi Anggaran yang Wajib Dihitung",
        "Strategi Optimasi Biaya Tanpa Mengorbankan Kualitas",
        "Formula & Tolok Ukur Pengembalian Investasi (ROI)",
        "Kriteria Pemilihan Partner Eksekusi & Validasi Anggaran",
      ],
      calloutTheme: "Kalkulasi ROI & Biaya",
      focusElement: "Tabel rincian alokasi biaya dan metrik evaluasi pengembalian investasi",
    },
    promptInstruction:
      "Tulis dengan gaya Cetak Biru Biaya & ROI. Fokus pada transparansi finansial, estimasi realistis, dan strategi alokasi anggaran cerdas. Hindari generalisasi klise, keseimbangan semu, atau bahasa berbunga-bunga; sajikan data dan formula kalkulasi yang dapat langsung diuji di spreadsheet pembaca.",
  },
};

export const INDUSTRIES: Record<IndustryId, IndustryContext> = {
  "sme-retail": {
    id: "sme-retail",
    name: "UKM & Retail Modern",
    workloadDescription: "Platform e-commerce, katalog online, dan sistem kasir/order terintegrasi dengan trafik fluktuatif.",
    commonChallenges: [
      "Tingkat bounce rate tinggi di perangkat mobile",
      "Keterbatasan integrasi pembayaran lokal dan logistik",
      "Biaya pemeliharaan toko online yang mahal jika memakai plugin berlebihan",
    ],
    keyBusinessGoals: "Meningkatkan konversi penjualan, mempercepat loading website, dan mempermudah manajemen stok.",
    conversionContext: "Layanan Pembuatan Website & Aplikasi Toko Online dari Inxora Studio.",
  },
  "b2b-saas": {
    id: "b2b-saas",
    name: "B2B SaaS & Startup Digital",
    workloadDescription: "Aplikasi berbasis web dengan dashboard interaktif, sistem langganan (subscription), dan API multi-tenant.",
    commonChallenges: [
      "Onboarding pengguna baru yang rumit dan menyebabkan churn",
      "Performa dashboard lambat saat mengolah data pelanggan dalam jumlah besar",
      "Kebutuhan time-to-market cepat untuk menguji product-market fit",
    ],
    keyBusinessGoals: "Mempercepat akuisisi pengguna, memperpanjang LTV (Lifetime Value), dan menyederhanakan alur kerja pengguna.",
    conversionContext: "Layanan Pengembangan Aplikasi Web Kustom & Konsultasi Arsitektur SaaS Inxora.",
  },
  "corporate-services": {
    id: "corporate-services",
    name: "Layanan Perusahaan & Profesional",
    workloadDescription: "Website profil korporat, portal klien, dan landing page akuisisi prospek (lead generation) bernilai tinggi.",
    commonChallenges: [
      "Tampilan website terkesan usang dan kurang mencerminkan kredibilitas institusi",
      "Rendahnya konversi dari pengunjung menjadi prospek bisnis valid",
      "Ketiadaan sistem manajemen konten (CMS) yang aman dan fleksibel untuk tim internal",
    ],
    keyBusinessGoals: "Membangun otoritas brand digital, meningkatkan lead conversion, dan memastikan keamanan data institusi.",
    conversionContext: "Layanan Desain UI/UX & Redesign Website Korporat Inxora Studio.",
  },
  "health-wellness": {
    id: "health-wellness",
    name: "Kesehatan, Medis & Wellness",
    workloadDescription: "Portal reservasi janji temu medis, telemedicine, dan aplikasi pemantauan kesehatan yang membutuhkan kepercayaan tinggi.",
    commonChallenges: [
      "Navigasi aplikasi membingungkan bagi pengguna awam dan lansia",
      "Kepatuhan privasi data dan perlindungan informasi medis pasien",
      "Sistem penjadwalan yang sering bentrok atau lambat merespons",
    ],
    keyBusinessGoals: "Menghadirkan pengalaman pengguna yang empati, responsif, dan menjamin privasi data secara menyeluruh.",
    conversionContext: "Layanan Pengembangan Aplikasi Mobile & Sistem Reservasi Kesehatan Inxora.",
  },
  "education-edutech": {
    id: "education-edutech",
    name: "Pendidikan & Edutech",
    workloadDescription: "Learning Management System (LMS), platform kursus online, dan portal pendaftaran peserta didik.",
    commonChallenges: [
      "Lonjakan trafik mendadak pada periode ujian atau pendaftaran siswa baru",
      "Tingkat penyelesaian materi kursus rendah akibat antarmuka yang membosankan",
      "Kendala pemutaran video streaming pada jaringan internet dengan bandwidth terbatas",
    ],
    keyBusinessGoals: "Meningkatkan engagement pembelajaran, memastikan website tetap stabil saat ujian serentak, dan kemudahan akses mobile.",
    conversionContext: "Layanan Pengembangan Platform Edukasi & LMS Skalabel Inxora Studio.",
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
