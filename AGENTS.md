# Inxora Autonomous AI Content Engine — Agent Instructions & Memory

Dokumen ini adalah *single source of truth* dan memori teknis untuk AI Assistant yang bekerja di repositori `inxora-content-engine`.

---

## 1. Misi & Peran
Repositori ini adalah mesin otomasi pembuatan konten teknis mandiri (*standalone client*) untuk **Inxora Studio**. 
Tujuan utamanya adalah menghasilkan artikel rekayasa perangkat lunak dan arsitektur sistem berskala enterprise yang:
- **AI Multi-Agent Orchestra**: 3 tahap kolaboratif (Architect -> Writer -> Reviewer) untuk kedalaman materi maksimal.
- **Universal Custom Endpoint**: Kompatibel dengan semua provider standar OpenAI REST (DeepSeek, OpenRouter, OpenAI, Groq, Ollama).
- **Bebas dari AI Slop**: Tidak menggunakan kalimat klise, gaya bahasa lugas arsitek (*Wahid Satrio Aji*).
- **Kaya Variasi (Content Diversity)**: Merotasi 5 arketipe narasi dan 5 skenario industri nyata agar artikel tidak monoton.
- **Tahan Kanibalisasi SEO**: Menghindari duplikasi keyword atau konsep dengan artikel yang sudah pernah terbit.
- **Terintegrasi ke Web Utama**: Mengirim hasil artikel via HTTP webhook berautentikasi Bearer ke web platform Inxora.

---

## 2. Arsitektur Komunikasi
- **Web Utama**: Berjalan di `http://localhost:3000` (lokal) atau `https://inxora.id` (produksi).
- **Webhook Endpoint**: `POST /api/webhooks/content-ingest`
- **Autentikasi**: Header `Authorization: Bearer <CONTENT_INGEST_SECRET>`
- **Database Web Utama**: Menggunakan Prisma ORM, sanitasi HTML DOMPurify, auto-linking ke author `Wahid Satrio Aji`, dan IndexNow instant ping.

---

## 3. Komponen Utama
- `src/services/ai-client.ts`: Universal REST client OpenAI-compatible dengan pembersih reasoning tags (`<think>`) dan code fences.
- `src/services/orchestra.ts`: 3-Stage Pipeline (Stage 1: Architect Blueprint -> Stage 2: Senior Writer Drafting -> Stage 3: Quality & Anti-Slop Auditor).
- `src/services/archetypes.ts`: Definisi 5 arketipe narasi (`war-story`, `deep-dive`, `benchmark-battle`, `production-blueprint`, `adr`) dan 5 industri (`fintech`, `ecommerce`, `saas`, `iot-logistics`, `healthtech`).
- `src/services/history-guard.ts`: Memantau feed artikel eksisting untuk proteksi kanibalisasi kata kunci dan menyimpan riwayat lokal di `data/published-history.json`.
- `src/services/writer.ts`: Dual-mode writer (Gemini API + Diverse Procedural Fallback).
- `src/services/writer.ts`: Integrasi AI Orchestra dengan automatic fallback ke Diverse Procedural Engine.
- `src/services/publisher.ts`: HTTP Client pengirim payload ke web utama.
- `src/cli.ts`: Runner CLI interaktif dengan flag `--topic`, `--category`, `--archetype`, `--industry`, `--publish`.
- `src/cli.ts`: Runner CLI interaktif dengan visual stage progress.

---

## 4. Konvensi Rekayasa
- Jalankan pemeriksaan type-safety: `npm run typecheck` (`tsc --noEmit`).
- Jalankan unit test AI client: `npm run test:ai` (`tsx src/test-ai-client.ts`).
- Jangan pernah hardcode credentials di kode sumber; gunakan `process.env`.
- Pertahankan struktur H2 semantik agar fitur Table of Contents (ToC) di web utama mengekstrak navigasi dengan mulus.

