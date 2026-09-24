# Inxora Autonomous AI Content Engine
# Inxora Autonomous AI Content Engine (Orchestra Edition)

Mesin otomasi pembuatan konten dan artikel teknis berkualitas tinggi untuk **Inxora Studio**, dirancang dengan prinsip **Strict Anti-AI-Slop**, optimalisasi SEO menyeluruh, serta loose coupling via webhook ingestion.
Mesin otomasi pembuatan konten dan artikel teknis berkualitas tinggi untuk **Inxora Studio**, dirancang dengan prinsip **Content Diversity Engine**, **Strict Anti-AI-Slop**, optimalisasi SEO menyeluruh, serta loose coupling via webhook ingestion.
Mesin otomasi pembuatan konten teknis tingkat lanjut untuk **Inxora Studio**, dirancang dengan arsitektur **AI Multi-Agent Orchestra**, **Universal Custom Endpoint** (OpenAI / DeepSeek / OpenRouter / Groq / Ollama), **Content Diversity Engine**, serta isolasi zero-load ke VPS via webhook ingestion.

---

## 🌟 Fitur Utama

1. **Zero VPS Load (Client-side AI Generation)**:
1. **Content Diversity Engine (Anti-Monoton & Anti-Slop)**:
   - **5 Narrative Archetypes**: Mencegah format berulang (War Story/Post-Mortem, Architectural Deep-Dive, Benchmark Battle, Production Blueprint, Architectural Decision Record).
   - **Real-World Industry Contexts**: Mengaitkan setiap topik ke industri nyata (FinTech, Flash-Sale E-Commerce, Multi-Tenant SaaS, Real-Time IoT, HealthTech).
   - **Anti-Cannibalization Guard**: Memonitor artikel yang sudah terbit di web utama untuk mencegah duplikasi sudut pandang atau kanibalisasi kata kunci.
1. **AI Multi-Agent Orchestra (3-Stage Specialized Pipeline)**:
   - **Stage 1 (The System Architect)**: Menganalisis skenario kegagalan, latensi p99, dan merancang *Technical Blueprint* serta kontrak kode.
   - **Stage 2 (The Senior Technical Writer)**: Mengembangkan blueprint menjadi draf HTML teknis yang padat dan menulis implementasi kode nyata (Persona: *Wahid Satrio Aji*).
   - **Stage 3 (The Anti-Slop & Quality Auditor)**: Mengaudit artikel, menghapus kata klise AI, memvalidasi syntax kode, merapikan struktur ToC, dan memoles SEO metadata.

2. **Zero VPS Load (Client-side AI Generation)**:
   - Seluruh proses riset, penulisan AI, pemilihan visual, dan pemformatan berjalan di mesin/laptop lokal Anda.
   - Server website Inxora (VPS) hanya menerima hasil artikel berupa JSON melalui webhook aman, tanpa terbebani pemrosesan AI sama sekali.
2. **Universal Custom Endpoint & Multi-Model Routing**:
   - Kompatibel dengan semua provider standar OpenAI REST: **DeepSeek**, **OpenRouter**, **OpenAI**, **Groq Cloud**, hingga **Ollama Lokal**.
   - Mendukung pemilihan model spesifik per-role (`AI_MODEL_ARCHITECT`, `AI_MODEL_WRITER`, `AI_MODEL_REVIEWER`) atau satu model terpadu (`AI_MODEL`).

2. **Strict Anti-AI-Slop Rules**:
   - Menghindari kalimat klise pembuka seperti *"In today's fast-paced digital world..."*.
   - Menggunakan tone *Principal System Architect*.
   - Wajib menyertakan matriks perbandingan teknis, diagram arsitektur/quote callout, dan blok kode nyata.
3. **Content Diversity Engine (Anti-Monoton & Anti-Slop)**:
   - **5 Narrative Archetypes**: Merotasi gaya artikel (War Story/Post-Mortem, Architectural Deep-Dive, Benchmark Battle, Production Blueprint, Architectural Decision Record).
   - **Real-World Industry Contexts**: Mengaitkan topik ke industri nyata (FinTech, Flash-Sale E-Commerce, Multi-Tenant SaaS, Real-Time IoT, HealthTech).
   - **Anti-Cannibalization Guard**: Memonitor artikel yang sudah terbit di web utama untuk mencegah duplikasi sudut pandang atau kanibalisasi kata kunci.

3. **SEO Integration Out-of-the-Box**:
   - **Internal Autolinker**: Otomatis menautkan keyword ke halaman layanan atau artikel sejenis.
   - **Table of Contents (ToC)**: Heading `<h2>` dan `<h3>` siap diekstrak menjadi ToC interaktif.
   - **E-E-A-T Compliance**: Terhubung ke profil author *Wahid Satrio Aji*.
   - **Table of Contents (ToC)**: Heading `<h2>` dan `<h3>` dinamis diekstrak menjadi ToC interaktif.
   - **E-E-A-T Compliance**: Terhubung ke profil author resmi *Wahid Satrio Aji*.
   - **Instant IndexNow**: Memicu ping ke Bing & Yandex otomatis saat artikel diterbitkan.
4. **Zero VPS Load & SEO Out-of-the-Box**:
   - Seluruh proses komputasi AI berjalan di laptop lokal Anda (VPS = 0% beban AI).
   - Pintu gerbang web utama memvalidasi Zod, sanitasi HTML DOMPurify, auto-linking ke author resmi *Wahid Satrio Aji*, dan ping instan IndexNow ke Bing & Yandex.
   - Fallback otomatis ke *Diverse Procedural Technical Engine* jika koneksi API luar offline.

4. **Dual-Mode Intelligence**:
   - **Online Mode**: Menggunakan Google Gemini API jika `GEMINI_API_KEY` terpasang.
   - **Procedural Technical Fallback**: Menghasilkan materi arsitektur mendalam secara mandiri jika tanpa API key.
   - **Diverse Procedural Technical Fallback**: Menghasilkan materi arsitektur mendalam dengan variasi struktur dan kode lengkap secara mandiri jika tanpa API key.

---

## 🚀 Panduan Instalasi & Persiapan
## 🚀 Panduan Instalasi & Konfigurasi

```bash
# 1. Masuk ke direktori engine
cd inxora-content-engine

# 2. Install dependensi
npm install

# 3. Konfigurasi environment
# 3. Buat file .env dari template
cp .env.example .env
```

Sesuaikan variabel di `.env`:
- `INXORA_API_URL`: Arahkan ke `http://localhost:3000/api/webhooks/content-ingest` (lokal) atau `https://domain-anda.com/api/webhooks/content-ingest` (VPS).
- `CONTENT_INGEST_SECRET`: Samakan dengan `CONTENT_INGEST_SECRET` di `.env` web utama Anda.
- `GEMINI_API_KEY`: (Opsional) Masukkan key Gemini AI Anda jika ingin menggunakan model LLM online.
### Konfigurasi `.env`:

```env
# Target Webhook Web Utama
INXORA_API_URL="http://localhost:3000/api/webhooks/content-ingest"
CONTENT_INGEST_SECRET="inxora-content-ingest-secret-2026-secure"

# Universal Custom AI Configuration
AI_API_KEY="sk-..."
AI_ENDPOINT="https://api.deepseek.com/chat/completions"
AI_MODEL="deepseek-chat"

# Opsional: Multi-Model Orchestra (Contoh: Combo DeepSeek)
AI_MODEL_ARCHITECT="deepseek-reasoner"
AI_MODEL_WRITER="deepseek-chat"
AI_MODEL_REVIEWER="deepseek-chat"
```

---

## 📖 Cara Penggunaan
## 📖 Cara Penggunaan CLI

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
### 2. Memaksa Arketipe atau Industri Tertentu
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
---

#### Pilihan Industri (`--industry`):
- `fintech`: FinTech & Payment Gateway (ACID, Idempotency, Zero Double-Spending)
- `ecommerce`: High-Traffic Flash Sale E-Commerce (Cache Stampede, Atomic Inventory)
- `saas`: Multi-Tenant Enterprise SaaS & AI Pipeline (Tenant RLS, Backpressure)
- `iot-logistics`: Real-time Logistics & IoT Telemetry (Timeseries, Stream Ingestion)
- `healthtech`: HealthTech & Telemedicine Platform (Field-Level Encryption, Audit Logging)
## 🧪 Uji Ketahanan & Validasi

```bash
# 1. Jalankan unit test AI Client & Orchestra Parser
npm run test:ai

# 2. Periksa type-safety TypeScript
npm run typecheck
```

---

## 🏗️ Struktur Proyek

```text
inxora-content-engine/
├── src/
│   ├── cli.ts                 # Entrypoint CLI command
│   ├── cli.ts                 # Entrypoint CLI command dengan opsi arketipe & industri
│   ├── cli.ts                 # CLI runner dengan visual progress orchestra
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
│   ├── services/
│   │   ├── ai-client.ts       # Universal OpenAI-compatible REST client
│   │   ├── orchestra.ts       # 3-Stage Pipeline (Architect -> Writer -> Reviewer)
│   │   ├── archetypes.ts      # 5 Narrative archetypes & 5 industry contexts
│   │   ├── history-guard.ts   # Anti-cannibalization memory & dedup guard
│   │   ├── researcher.ts      # Intent, audience, category & diversity mapping
│   │   ├── image-generator.ts # Resolusi visual cover 16:9
│   │   ├── writer.ts          # Integrasi Orchestra & Diverse Procedural Fallback
│   │   └── publisher.ts       # HTTP client pengirim payload ke webhook
│   └── test-ai-client.ts      # Test resilience parsing code fence & reasoning tags
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── AGENTS.md
└── README.md
```

