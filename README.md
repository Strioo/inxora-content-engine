# Inxora Autonomous AI Content Engine

Mesin otomasi pembuatan konten dan artikel teknis berkualitas tinggi untuk **Inxora Studio**, dirancang dengan prinsip **Strict Anti-AI-Slop**, optimalisasi SEO menyeluruh, serta loose coupling via webhook ingestion.
Mesin otomasi pembuatan konten dan artikel teknis berkualitas tinggi untuk **Inxora Studio**, dirancang dengan prinsip **Content Diversity Engine**, **Strict Anti-AI-Slop**, optimalisasi SEO menyeluruh, serta loose coupling via webhook ingestion.

---

## 🌟 Fitur Utama

1. **Zero VPS Load (Client-side AI Generation)**:
1. **Content Diversity Engine (Anti-Monoton & Anti-Slop)**:
   - **5 Narrative Archetypes**: Mencegah format berulang (War Story/Post-Mortem, Architectural Deep-Dive, Benchmark Battle, Production Blueprint, Architectural Decision Record).
   - **Real-World Industry Contexts**: Mengaitkan setiap topik ke industri nyata (FinTech, Flash-Sale E-Commerce, Multi-Tenant SaaS, Real-Time IoT, HealthTech).
   - **Anti-Cannibalization Guard**: Memonitor artikel yang sudah terbit di web utama untuk mencegah duplikasi sudut pandang atau kanibalisasi kata kunci.

2. **Zero VPS Load (Client-side AI Generation)**:
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
   - **Table of Contents (ToC)**: Heading `<h2>` dan `<h3>` dinamis diekstrak menjadi ToC interaktif.
   - **E-E-A-T Compliance**: Terhubung ke profil author resmi *Wahid Satrio Aji*.
   - **Instant IndexNow**: Memicu ping ke Bing & Yandex otomatis saat artikel diterbitkan.

4. **Dual-Mode Intelligence**:
   - **Online Mode**: Menggunakan Google Gemini API jika `GEMINI_API_KEY` terpasang.
   - **Procedural Technical Fallback**: Menghasilkan materi arsitektur mendalam secara mandiri jika tanpa API key.
   - **Diverse Procedural Technical Fallback**: Menghasilkan materi arsitektur mendalam dengan variasi struktur dan kode lengkap secara mandiri jika tanpa API key.

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

### 1. Mode Otomatis (Smart Diversity Rotation)
Engine secara cerdas akan mengacak arketipe dan studi kasus industri yang paling segar:
```bash
# 1. Buat artikel baru sebagai DRAFT (Review dulu di dashboard admin)
# Simpan sebagai DRAFT
npm run generate -- --topic="Pola Komunikasi Asinkron Event-Driven Architecture dengan Kafka"

# 2. Buat artikel dan LANGSUNG TERBITKAN (PUBLISHED + IndexNow ping)
# Langsung terbitkan ke publik (PUBLISHED + IndexNow ping)
npm run generate -- --topic="Strategi Optimasi Query Database Skala Besar pada High-Concurrency" --publish
```

# 3. Tentukan kategori spesifik
npm run generate -- --topic="Penerapan Zero-Trust Security pada Cloud Native" --category="System Architecture & Cloud" --publish
### 2. Memaksa Arketipe atau Industri Tertentu (CLI Overrides)
```bash
# Gaya War Story / Post-Mortem pada Industri FinTech
npm run generate -- --topic="Mitigasi Deadlock pada Mutasi Saldo" --archetype="war-story" --industry="fintech" --publish

# Gaya Architectural Decision Record (ADR) pada E-Commerce
npm run generate -- --topic="Migrasi Cache ke Multi-Tier Caching" --archetype="adr" --industry="ecommerce" --publish

# Gaya Hands-on Production Blueprint pada HealthTech
npm run generate -- --topic="Partisi dan Enkripsi Data Pasien" --archetype="production-blueprint" --industry="healthtech" --publish
```

#### Pilihan Arketipe (`--archetype`):
- `war-story`: The Post-Mortem & Incident Investigation
- `deep-dive`: Architectural Deep-Dive & Internals
- `benchmark-battle`: Pragmatic Benchmark & Tech Evaluation
- `production-blueprint`: Hands-on Production Blueprint
- `adr`: Architectural Decision Record

#### Pilihan Industri (`--industry`):
- `fintech`: FinTech & Payment Gateway (ACID, Idempotency, Zero Double-Spending)
- `ecommerce`: High-Traffic Flash Sale E-Commerce (Cache Stampede, Atomic Inventory)
- `saas`: Multi-Tenant Enterprise SaaS & AI Pipeline (Tenant RLS, Backpressure)
- `iot-logistics`: Real-time Logistics & IoT Telemetry (Timeseries, Stream Ingestion)
- `healthtech`: HealthTech & Telemedicine Platform (Field-Level Encryption, Audit Logging)

---

## 🏗️ Struktur Proyek

```text
inxora-content-engine/
├── src/
│   ├── cli.ts                 # Entrypoint CLI command
│   ├── cli.ts                 # Entrypoint CLI command dengan opsi arketipe & industri
│   ├── config.ts              # Konfigurasi kategori, author, dan layanan Inxora
│   ├── prompts/
│   │   └── anti-slop.ts       # Strict anti-slop prompt engineering
│   └── services/
│       ├── researcher.ts      # Search intent, audience, & category mapping
│       ├── archetypes.ts      # 5 Narrative archetypes & 5 real-world industry contexts
│       ├── history-guard.ts   # Anti-cannibalization memory & dedup guard
│       ├── researcher.ts      # Intent, audience, category & diversity mapping
│       ├── image-generator.ts # Resolusi visual cover 16:9
│       ├── writer.ts          # Mesin pembuat materi (Gemini API + Fallback)
│       ├── writer.ts          # Dual-mode writer (Gemini API + Diverse Fallback)
│       └── publisher.ts       # HTTP client pengirim payload ke webhook
├── data/
│   └── published-history.json # Local cache artikel terbit untuk proteksi kanibalisasi
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

