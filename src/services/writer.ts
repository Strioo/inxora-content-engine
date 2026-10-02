import { ResearchPlan } from "./researcher.js";
import { INXORA_SERVICES } from "../config.js";
import { getAIConfig } from "./ai-client.js";
import { runOrchestraPipeline, PolishedArticle, TitleVariants } from "./orchestra.js";
import { FAQItem } from "./publisher.js";
import { ArticleVisualPackage } from "./image-generator.js";

export interface GeneratedArticle {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  metaTitle: string;
  metaDesc: string;
  category: string;
  finalScore?: number;
  iterationsCount?: number;
  faqItems?: FAQItem[];
  titleVariants?: TitleVariants;
  metadata?: Record<string, unknown>;
}

function generateTechnicalDraft(
  plan: ResearchPlan,
  visualPackage?: ArticleVisualPackage
): GeneratedArticle {
  const { topic, category, recommendedKeywords, archetype, industry } = plan;

  // 1. Dynamic Title based on Archetype
  let title = topic;
  switch (archetype.id) {
    case "practical-guide":
      title = topic.toLowerCase().startsWith("panduan")
        ? topic
        : `Panduan Lengkap ${topic}: Strategi Implementasi untuk ${industry.name}`;
      break;
    case "strategic-comparison":
      title = topic.toLowerCase().includes("vs")
        ? `Komparasi Mendalam: ${topic}`
        : `Evaluasi & Matriks Komparasi: Memilih Solusi ${topic}`;
      break;
    case "problem-solver-checklist":
      title = `Diagnostik & Checklist: Mengatasi Masalah Utama pada ${topic}`;
      break;
    case "business-innovation-insight":
      title = `Wawasan Strategis: Memanfaatkan ${topic} untuk Keunggulan Bisnis`;
      break;
    case "cost-and-roi-blueprint":
      title = `Estimasi Biaya & ROI: Panduan Perencanaan ${topic} bagi Founder`;
      break;
    default:
      title = `Panduan & Strategi Eksekusi: ${topic}`;
  }

  if (title.length > 95) {
    title = title.slice(0, 92) + "...";
  }

  const excerpt = `Panduan praktis mengenai ${archetype.tagline.toLowerCase()} pada ${topic.toLowerCase()} untuk membantu ${plan.targetAudience.toLowerCase()} mengambil keputusan tepat.`;

  // Pick relevant service link from live knowledge context
  const liveServices = plan.knowledgeContext?.services || INXORA_SERVICES;
  const relevantService =
    liveServices.find((s) =>
      category.toLowerCase().includes(s.name.toLowerCase().slice(0, 5))
    ) || liveServices[0];

  const h2 = archetype.headingBlueprint.h2Sections;

  const inlineFigure = visualPackage?.inlineVisual
    ? `
<figure class="my-8 overflow-hidden rounded-xl border border-border/40 bg-muted/20">
  <img src="${visualPackage.inlineVisual.coverUrl}" alt="${visualPackage.inlineVisual.altText}" class="w-full h-auto object-cover rounded-t-xl" loading="lazy" />
  <figcaption class="p-3 text-xs text-muted-foreground text-center bg-muted/10 border-t border-border/20">
    Foto oleh <a href="${visualPackage.inlineVisual.attribution.authorUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">${visualPackage.inlineVisual.attribution.author}</a> di <a href="${visualPackage.inlineVisual.attribution.sourceUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">Unsplash</a> (${visualPackage.inlineVisual.attribution.license})
  </figcaption>
</figure>
`
    : "";

  const content = `
<p>
  Di sektor <strong>${industry.name}</strong>, website yang lambat langsung membakar anggaran pemasaran sebelum pengunjung sempat melihat penawaran Anda. Pengunjung tidak menunggu kode JavaScript selesai diurai. Jika antarmuka macet lebih dari dua detik, mereka menutup tab dan berpindah ke kompetitor.
</p>
<p>
  Membangun arsitektur web modern mirip seperti menata alur dapur restoran yang sibuk. Jika jalur penyajian makanan terhambat oleh perkakas yang tidak terpakai, pesanan pelanggan menumpuk dan bisnis merugi. Begitu pula dengan beban skrip dan dependensi halaman web: rancangan modular yang bersih menentukan seberapa cepat pengunjung bertransisi menjadi pelanggan aktif.
</p>

<h2>${h2[0]}</h2>
<p>
  Banyak pengambil keputusan menghadapi dilema nyata: memilih solusi template instan yang cepat dirilis namun kaku, atau membangun arsitektur kustom yang butuh perencanaan lebih disiplin. Pada skenario operasional lapangan, tantangan utama yang dihadapi meliputi:
</p>
<ul>
  ${industry.commonChallenges.map((c) => `<li><strong>${c}:</strong> Menekan tingkat konversi dan membebani tim pendukung pelanggan.</li>`).join("\n  ")}
</ul>

<blockquote>
  <p><strong>Wawasan Eksekusi:</strong> ${archetype.headingBlueprint.calloutTheme}: Kunci utama keputusan teknologi adalah menyeimbangkan kecepatan peluncuran awal dengan ketahanan arsitektur, sehingga bisnis tidak terbebani utang teknis saat volume pengguna melonjak.</p>
</blockquote>

${inlineFigure}

<h2>${h2[1]}</h2>
<p>
  Tabel berikut merangkum perbandingan langsung antara pendekatan konvensional dengan standar arsitektur modern yang diterapkan Inxora Studio:
</p>

<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse; margin: 1.5rem 0;">
  <thead>
    <tr style="background-color: rgba(255,255,255,0.05);">
      <th>Parameter Penilaian</th>
      <th>Pendekatan Konvensional / Template Instan</th>
      <th>Standar Solusi Modern Inxora (${industry.name})</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Kecepatan Akses (Core Web Vitals)</strong></td>
      <td>LCP rata-rata > 3.5 detik, beban skrip berlebih</td>
      <td>LCP < 1.8 detik dengan Server Components dan asset stream ringan</td>
    </tr>
    <tr>
      <td><strong>Skalabilitas & Fleksibilitas Fitur</strong></td>
      <td>Terbatas pada modul bawaan plugin</td>
      <td>Arsitektur modular, siap dihubungkan ke sistem bisnis dan API internal</td>
    </tr>
    <tr>
      <td><strong>Total Cost of Ownership (TCO)</strong></td>
      <td>Murah di awal, membengkak pada biaya tambal-sulam</td>
      <td>Biaya terprediksi dengan infrastruktur cloud efisien</td>
    </tr>
    <tr>
      <td><strong>Struktur SEO & Visibilitas Organik</strong></td>
      <td>Struktur HTML generik dengan metadata statis</td>
      <td>Semantic HTML penuh, Core Web Vitals optimal, dan Schema terstruktur</td>
    </tr>
  </tbody>
</table>

<h2>${h2[2]}</h2>
<p>
  Terapkan langkah-langkah praktis berikut ke dalam siklus perencanaan tim Anda:
</p>

<ol>
  <li><strong>Audit Alur Kritis Pengguna:</strong> Petakan titik friksi navigasi dan checkout sebelum menentukan tumpukan teknologi.</li>
  <li><strong>Pangkas Skrip Pihak Ketiga:</strong> Batasi pelacak dan pustaka berat agar waktu muat mobile stabil di bawah 2 detik.</li>
  <li><strong>Terapkan Komponen Modular:</strong> Pisahkan logika bisnis dari lapisan tampilan agar sistem mudah dirawat jangka panjang.</li>
  <li><strong>Sederhanakan Titik Konversi:</strong> Pasang formulir ringkas dan Call-to-Action (CTA) kontekstual pada setiap titik keputusan penting.</li>
</ol>

<h2>${h2[3] || "Kesalahan Umum dalam Implementasi & Cara Menghindarinya"}</h2>
<p>
  Banyak inisiatif digital meleset bukan karena kekurangan fitur, melainkan karena keputusan teknis yang tergesa-gesa. Kesalahan yang paling sering ditemui mencakup penumpukan plugin pihak ketiga tanpa audit keamanan, pengabaian aksesibilitas mobile, dan ketiadaan instrumen pemantauan performa harian.
</p>
<p>
  Memperbaiki cacat arsitektur setelah platform diluncurkan ke pasar membutuhkan biaya jauh lebih tinggi dibanding membangun fondasi yang tepat sejak awal.
</p>

<h2>${h2[4] || "Roadmap Eksekusi & Langkah Awal Implementasi 30 Hari"}</h2>
<p>
  Awali dengan validasi data nyata. Selama 14 hari pertama, ukur metrik performa aktual dan tingkat pentalan (bounce rate) pada halaman utama platform Anda. Gunakan temuan tersebut untuk memprioritaskan area perbaikan yang menghasilkan kenaikan konversi paling cepat.
</p>
<p>
  Jika Anda sedang merencanakan modernisasi atau pembangunan sistem baru, tim spesialis di Inxora Studio siap bermitra melalui layanan <a href="${relevantService.path}"><strong>${relevantService.name}</strong></a>. Kami membantu pimpinan bisnis merancang produk digital berkinerja tinggi yang siap menopang pertumbuhan skala bisnis Anda.
</p>
  `.trim();

  const safeExcerpt = excerpt.length > 195 ? excerpt.slice(0, 192) + "..." : excerpt;
  const safeMetaDesc = safeExcerpt.length > 155 ? safeExcerpt.slice(0, 152) + "..." : safeExcerpt;

  const faqItems: FAQItem[] = [
    {
      question: `Apa keuntungan utama menerapkan strategi ini bagi pertumbuhan bisnis?`,
      answer: `Implementasi yang tepat memotong waktu muat halaman dan menekan biaya infrastruktur cloud, sehingga rasio konversi pengunjung menjadi prospek bisnis naik secara terukur.`,
    },
    {
      question: `Berapa lama estimasi waktu yang dibutuhkan untuk proses implementasi?`,
      answer: `Tergantung kompleksitas sistem, fase audit hingga peluncuran MVP umumnya berlangsung antara 2 hingga 8 pekan dengan milestone mingguan transparan.`,
    },
    {
      question: `Bagaimana Inxora Studio mendampingi implementasi solusi ini?`,
      answer: `Inxora Studio menyediakan konsultasi arsitektur, perancangan antarmuka berbasis data konversi, dan rekayasa kode siap skala yang disesuaikan dengan target bisnis Anda.`,
    },
  ];

  const titleVariants: TitleVariants = {
    searchIntent: title,
    painPointROI: `Strategi Efisiensi: ${title}`,
    curiosityInsight: `Analisis & Matriks Keputusan: ${title}`,
  };

  return {
    title,
    excerpt: safeExcerpt,
    content,
    tags: Array.from(new Set([...recommendedKeywords, industry.name.split(" ")[0], "Strategi Bisnis"])).slice(0, 5),
    metaTitle: title.length > 55 ? title.slice(0, 65) : `${title} · Inxora`,
    metaDesc: safeMetaDesc,
    category,
    faqItems,
    titleVariants,
    metadata: {
      titleVariants,
      mode: "procedural-baseline",
    },
  };
}

export async function generateArticle(
  plan: ResearchPlan,
  visualPackage?: ArticleVisualPackage
): Promise<GeneratedArticle> {
  const config = getAIConfig();

  if (config.apiKey) {
    try {
      console.log(`[Writer] Initializing AI Multi-Agent Orchestra with endpoint: ${config.endpoint}...`);
      const polished: PolishedArticle = await runOrchestraPipeline(plan, 3, visualPackage);
      return polished;
    } catch (err: unknown) {
      console.warn(`[Writer] AI Orchestra pipeline encountered an issue. Falling back to procedural engine:`, err);
    }
  } else {
    console.log(`[Writer] No AI_API_KEY detected in .env. Running procedural engine.`);
  }

  return generateTechnicalDraft(plan, visualPackage);
}
