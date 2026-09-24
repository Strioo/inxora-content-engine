# Inxora Autonomous AI Content Engine

Mesin otomasi pembuatan konten dan artikel teknis berkualitas tinggi untuk **Inxora Studio**, dirancang dengan prinsip **Strict Anti-AI-Slop**, optimalisasi SEO menyeluruh, serta loose coupling via webhook ingestion.

---

## 🌟 Fitur Utama

1. **Zero VPS Load (Client-side AI Generation)**:
   - Seluruh proses riset, penulisan AI, pemilihan visual, dan pemformatan berjalan di mesin/laptop lokal Anda.
   - Server website Inxora (VPS) hanya menerima hasil artikel berupa JSON melalui webhook aman, tanpa terbebani pemrosesan AI sama sekali.

2. **Strict Anti-AI-Slop Rules**:
   - Menghindari kalimat klise pembuka seperti *"In today's fast-paced digital world..."*.
   - Menggunakan tone *Principal System Architect*.
   - Wajib menyertakan matriks perbandingan teknis, diagram arsitektur/quote callout, dan blok kode nyata.

3. **SEO Integration Out-of-the-Box**:
   - **Internal Autolinker**: Otomatis menautkan keyword ke halaman layanan atau artikel sejenis.
   - **Table of Contents (ToC)**: Heading `<h2>` dan `<h3>` siap diekstrak menjadi ToC interaktif.
   - **E-E-A-T Compliance**: Terhubung ke profil author *Wahid Satrio Aji*.
   - **Instant IndexNow**: Memicu ping ke Bing & Yandex otomatis saat artikel diterbitkan.

4. **Dual-Mode Intelligence**:
   - **Online Mode**: Menggunakan Google Gemini API jika `GEMINI_API_KEY` terpasang.
   - **Procedural Technical Fallback**: Menghasilkan materi arsitektur mendalam secara mandiri jika tanpa API key.

---

## 🚀 Panduan Instalasi & Persiapan

```bash
# 1. Masuk ke direktori engine
cd inxora-content-engine

# 2. Install dependensi
npm install

# 3. Konfigurasi environment
cp .env.example .env
```

Sesuaikan variabel di `.env`:
- `INXORA_API_URL`: Arahkan ke `http://localhost:3000/api/webhooks/content-ingest` (lokal) atau `https://domain-anda.com/api/webhooks/content-ingest` (VPS).
- `CONTENT_INGEST_SECRET`: Samakan dengan `CONTENT_INGEST_SECRET` di `.env` web utama Anda.
- `GEMINI_API_KEY`: (Opsional) Masukkan key Gemini AI Anda jika ingin menggunakan model LLM online.

---

## 📖 Cara Penggunaan

```bash
# 1. Buat artikel baru sebagai DRAFT (Review dulu di dashboard admin)
npm run generate -- --topic="Pola Komunikasi Asinkron Event-Driven Architecture dengan Kafka"

# 2. Buat artikel dan LANGSUNG TERBITKAN (PUBLISHED + IndexNow ping)
npm run generate -- --topic="Strategi Optimasi Query Database Skala Besar pada High-Concurrency" --publish

# 3. Tentukan kategori spesifik
npm run generate -- --topic="Penerapan Zero-Trust Security pada Cloud Native" --category="System Architecture & Cloud" --publish
```

---

## 🏗️ Struktur Proyek

```text
inxora-content-engine/
├── src/
│   ├── cli.ts                 # Entrypoint CLI command
│   ├── config.ts              # Konfigurasi kategori, author, dan layanan Inxora
│   ├── prompts/
│   │   └── anti-slop.ts       # Strict anti-slop prompt engineering
│   └── services/
│       ├── researcher.ts      # Search intent, audience, & category mapping
│       ├── image-generator.ts # Resolusi visual cover 16:9
│       ├── writer.ts          # Mesin pembuat materi (Gemini API + Fallback)
│       └── publisher.ts       # HTTP client pengirim payload ke webhook
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

