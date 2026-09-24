<h1 align="center">🗣️ Indic-Chat</h1>

<p align="center">
  <strong>Intelligent Tutoring System with Cross-Lingual RAG for Multilingual Education</strong><br/>
  Ask NCERT Class-10 questions in any of the 22 scheduled Indian languages — get accurate, curriculum-grounded answers in the same language.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/ChromaDB-RAG-FF6B35" />
  <img src="https://img.shields.io/badge/IndicTrans2-22%20Languages-FF9933" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ✨ What is Indic-Chat?

India’s education system serves over 250 million school-going students across **22 constitutionally recognised languages**, yet the vast majority of digital educational tools and AI tutoring systems operate exclusively in English. This creates a significant barrier for students in rural and semi-urban regions who learn best in their mother tongues.

**Indic-Chat** is a full-stack, multilingual, adaptive AI tutoring system that closes this gap. It provides an intelligent conversational tutor grounded in the **NCERT Class-10 curriculum** (Mathematics, Science, and English) and is capable of understanding and responding in **all 22 scheduled Indian languages**.

### How it works (English-Pivot Architecture)

1. Student asks a question in any supported language  
2. **IndicLID** detects the language  
3. **IndicTrans2** translates the query to English (with scientific term & LaTeX protection)  
4. **RAG** retrieves the most relevant NCERT textbook chunks (ChromaDB + BGE-small-en-v1.5)  
5. **Gemma-4-E2B** (via Ollama, with automatic fallback) generates a curriculum-aligned response  
6. The response is translated back into the student’s preferred language  
7. The answer streams to the UI via Server-Sent Events (SSE) with Markdown + KaTeX rendering  

All intermediate reasoning, retrieval, and generation happens in English — the language in which modern LLMs and embedding models perform best — while students interact entirely in their preferred language.

---

## 🚀 Key Features

| Feature | Details |
|---|---|
| **22 Scheduled Indian Languages** | Full support via AI4Bharat IndicTrans2 (200M distilled) + IndicLID |
| **English-Pivot Architecture** | Queries translated → RAG + LLM in English → response translated back |
| **Curriculum-Grounded RAG** | NCERT Class-10 Math, Science & English textbooks indexed in ChromaDB |
| **Domain Term Protection** | Scientific & mathematical terminology preserved during translation |
| **LaTeX / KaTeX Protection** | Math expressions protected from corruption by the NMT pipeline |
| **Adaptive Learning Engine** | Three-strike difficulty adjustment + four-level per-topic mastery (novice → learning → proficient → mastered) |
| **Real-time Streaming Chat** | Token-by-token responses via Server-Sent Events (SSE) |
| **Difficulty-Adaptive MCQ Quizzes** | Generated questions with personalised written feedback |
| **Teacher Analytics Dashboard** | JWT-protected insights into student performance, language usage & topic mastery |
| **Multi-Provider LLM Fallback** | Ollama (primary) → OpenRouter (automatic failover) |
| **PDF Textbook Ingestion** | PyMuPDF + Tesseract OCR fallback for scanned pages |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React 19 + Vite 6 Frontend                   │
│   Chat UI · Quiz Engine · Teacher Dashboard · KaTeX Math        │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST + SSE
┌────────────────────────────▼────────────────────────────────────┐
│                    FastAPI Backend (Async)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Language    │  │     RAG      │  │   Translation         │  │
│  │  Detection   │  │  (ChromaDB + │  │  (IndicTrans2 200M)   │  │
│  │  (IndicLID)  │  │  BGE-small)  │  │  + Term/LaTeX Protect │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Adaptive    │  │     LLM      │  │  Auth + Analytics       │  │
│  │  Learning    │  │ (Gemma-4-E2B │  │  (JWT + SQLite)       │  │
│  │  Engine      │  │  / Ollama)   │  │                       │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### English-Pivot Data Flow

```
Student Input (Any Supported Language)
        ↓
Language Detection (IndicLID)
        ↓
Translation to English (IndicTrans2 + Term/LaTeX protection)
        ↓
Intent Classification (Heuristic + LLM)
        ↓
RAG Retrieval (ChromaDB + BGE Embeddings)
        ↓
Adaptive Prompt Construction
        ↓
LLM Generation (Gemma-4-E2B via Ollama → fallback)
        ↓
Translation to Student’s Language (IndicTrans2)
        ↓
Response Delivery (SSE Streaming / JSON)
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 19 | SPA framework |
| Vite | 6 | Build tool & dev server |
| TailwindCSS | 4 | Utility-first styling |
| ReactMarkdown + KaTeX | 10.1 + 0.16 | Markdown & math rendering |
| Recharts | 2.15 | Dashboard visualisations |
| Axios | 1.7 | HTTP client |
| Vitest | 4.1 | Unit & integration testing |

### Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115+ | Async REST + SSE API |
| SQLAlchemy + aiosqlite | 2.0+ | Async ORM (SQLite + WAL) |
| ChromaDB | 0.5+ | Vector store for RAG |
| Sentence Transformers | 3.1.1 | BGE-small-en-v1.5 embeddings |

### AI Models
| Model | Purpose |
|---|---|
| **IndicTrans2** (200M distilled) | Bidirectional Indic ↔ English NMT |
| **IndicLID** | Language identification (47 classes) |
| **Gemma-4-E2B** (via Ollama) | Primary LLM for tutoring responses |
| **BGE-small-en-v1.5** | Dense embeddings for RAG retrieval |

### Infrastructure
- **Ollama** — local LLM serving  
- **PyMuPDF + Tesseract** — PDF text extraction & OCR  
- **JWT** — teacher dashboard authentication  

---

## ⚙️ Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) (recommended for local inference) **or** an OpenRouter API key
- Hugging Face account (for IndicTrans2 model weights)

### 1. Clone & configure

```bash
git clone https://github.com/DragonLegend73/indic-chat.git
cd indic-chat

cp backend/.env.example backend/.env
# Edit backend/.env with your API keys and settings
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Download AI4Bharat models:

```bash
bash setup_ai4bharat.sh
```

Ingest NCERT textbooks into ChromaDB:

```bash
python ingest.py
```

Start the server:

```bash
bash dev.sh
# or: uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at **http://localhost:5173**

---

## 🌐 Environment Variables

| Variable | Description |
|---|---|
| `LLM_PROVIDER` | `ollama` / `openrouter` (primary provider) |
| `OLLAMA_MODEL` | e.g. `gemma2:2b`, `llama3.2:3b` |
| `OPENROUTER_API_KEY` | Optional — used for automatic fallback |
| `HF_TOKEN` | Hugging Face token for IndicTrans2 weights |
| `TEACHER_PASSWORD` | Password for the teacher analytics dashboard |
| `JWT_SECRET` | Random secret used for JWT signing |

---

## 🧪 Testing

```bash
# Backend (pytest)
cd backend && python -m pytest

# Frontend (Vitest)
cd frontend && npm test
```

The test suite covers:
- Frontend component rendering, routing & SSE state machine
- Translation pipeline quality + term/LaTeX protection fidelity
- Language detection across native-script and romanised inputs
- API endpoint correctness and JWT authentication gating
- Full English-pivot chat pipeline (Hindi, Tamil, Bengali sample queries)

---

## 📁 Project Structure

```
indic-chat/
├── backend/
│   ├── app/
│   │   ├── routers/          # chat, quiz, students, analytics, auth
│   │   ├── services/         # translation, llm, rag, adaptive, language, intent
│   │   ├── models/           # SQLAlchemy models (Student, Interaction, QuizAttempt, TopicMastery)
│   │   ├── prompts/          # Difficulty-aware system prompts
│   │   └── data/             # Language list, NCERT term dictionary
│   ├── requirements.txt
│   ├── setup_ai4bharat.sh
│   ├── ingest.py
│   └── .env.example
└── frontend/
    └── src/
        ├── components/       # Chat, Quiz, Dashboard, layout
        ├── pages/            # ChatPage, QuizPage, DashboardPage, StudentSelect
        ├── context/          # StudentContext (global student state)
        ├── hooks/
        └── utils/            # API client, quiz scoring, language helpers
```

---

## 🔑 Key Implementation Highlights

- **English-Pivot Pattern** — Only two IndicTrans2 models (Indic→English and English→Indic) are required instead of 462 direct pairs. All RAG retrieval and LLM reasoning occur in English.
- **Term Protection Layer** — NCERT scientific and mathematical terms are replaced with numbered placeholders before translation and restored afterward, preventing paraphrasing or corruption.
- **LaTeX Protection** — Inline (`$...$`) and display (`$$...$$`) math expressions are extracted before translation and reinjected after, guaranteeing equation integrity.
- **Adaptive Difficulty** — Global three-strike rule (promote / demote difficulty tier) combined with continuous per-topic accuracy mapped to four mastery labels.
- **Singleton Lazy Loading** — Heavy models (IndicTrans2, embeddings, LLM) load once on first use and remain resident, minimising memory footprint and cold-start latency.
- **SSE Streaming** — Tokens are pushed to the client as they are generated; a separate “translating” event informs the UI while the final response is rendered in the student’s language.
- **Multi-Provider Fallback** — If the primary Ollama instance is unavailable, the system transparently retries against OpenRouter without user intervention.

---

## 📊 Supported Languages

All **22 scheduled Indian languages** + English:

Assamese · Bengali · Bodo · Dogri · Gujarati · Hindi · Kannada · Kashmiri · Konkani · Maithili · Malayalam · Manipuri · Marathi · Nepali · Odia · Punjabi · Sanskrit · Santali · Sindhi · Tamil · Telugu · Urdu · English

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

<p align="center">
  Built as a Capstone Project (CSI4901) — Vellore Institute of Technology<br/>
  <em>NLP · Cross-Lingual RAG · Multilingual AI · Adaptive Learning</em>
</p>
