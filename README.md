<h1 align="center">🗣️ Indic-chat</h1>

<p align="center">
  <strong>AI-powered multilingual educational chatbot for Indian students</strong><br/>
  Ask NCERT questions in your native language — get answers in the same language.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/ChromaDB-RAG-FF6B35" />
  <img src="https://img.shields.io/badge/IndicTrans2-12+%20Languages-FF9933" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ✨ What is this?

Indic-chat is a full-stack AI tutoring system that lets Indian students interact with NCERT curriculum content in **12+ Indic languages** (Hindi, Marathi, Tamil, Telugu, Bengali, etc.).

- A student types a question **in any Indic language**
- The system detects their language, translates to English, retrieves relevant NCERT content via **RAG**, generates an LLM response, and translates it back — all transparently
- Teachers get a **dashboard** with per-student analytics, weak topic heatmaps, and quiz performance tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│   Chat UI · Quiz Engine · Teacher Dashboard · KaTeX Math    │
└───────────────────────┬─────────────────────────────────────┘
                        │ FastAPI (REST + Streaming)
┌───────────────────────▼─────────────────────────────────────┐
│                      Backend Services                        │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Language   │  │     RAG      │  │   Translation      │  │
│  │  Detection  │  │  (ChromaDB + │  │  (IndicTrans2 NMT) │  │
│  │  (IndicLID) │  │  Embeddings) │  │                    │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Adaptive  │  │     LLM      │  │      Auth          │  │
│  │   Quiz      │  │ (Ollama/OAI) │  │   (JWT + SQLite)   │  │
│  │   Engine    │  │              │  │                    │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Features

| Feature | Details |
|---|---|
| **Multilingual Chat** | 12+ Indic languages via AI4Bharat IndicTrans2 NMT |
| **RAG Pipeline** | NCERT content ingested into ChromaDB + BGE embeddings |
| **Adaptive Quiz** | Tracks weak topics per student; adjusts question difficulty |
| **Teacher Dashboard** | Per-student progress, topic heatmaps, language distribution charts |
| **Math Rendering** | KaTeX for LaTeX equations in questions and responses |
| **LLM Flexibility** | Plug-in Ollama (local), OpenRouter, or Groq |
| **Rate Limiting** | SlowAPI-based per-IP rate limiting |
| **Auth** | JWT-based teacher authentication with bcrypt password hashing |

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — async REST API with streaming support
- **ChromaDB** — vector store for NCERT document chunks
- **Sentence Transformers** — `BAAI/bge-small-en-v1.5` for English embeddings
- **IndicTrans2** — AI4Bharat neural machine translation (200M parameter distilled)
- **IndicLID** — Indic language identification
- **SQLAlchemy + aiosqlite** — async SQLite for student/quiz data
- **PyMuPDF + Tesseract** — NCERT PDF ingestion pipeline

### Frontend
- **React 18** + Vite
- **KaTeX** — math formula rendering
- **Vitest** — component and unit testing

---

## ⚙️ Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) (for local LLM) **or** an OpenRouter/Groq API key
- HuggingFace account (for IndicTrans2 model weights)

### 1. Clone & configure

```bash
git clone https://github.com/DragonLegend73/indic-chat.git
cd indic-chat
```

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys and settings
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Download AI4Bharat models:
```bash
bash setup_ai4bharat.sh
```

Ingest NCERT content into ChromaDB:
```bash
python ingest.py
```

Run the server:
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

The app will be available at **http://localhost:5173**

---

## 🌐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `LLM_PROVIDER` | `ollama` / `openrouter` / `groq` |
| `OLLAMA_MODEL` | e.g. `gemma3:4b`, `llama3.2:3b` |
| `OPENROUTER_API_KEY` | Optional — OpenRouter free tier |
| `GROQ_API_KEY` | Optional — Groq free tier |
| `HF_TOKEN` | HuggingFace token for IndicTrans2 |
| `TEACHER_PASSWORD` | Teacher dashboard password |
| `JWT_SECRET` | Random secret for JWT signing |

---

## 🧪 Testing

```bash
# Backend
cd backend && python -m pytest

# Frontend
cd frontend && npm test
```

---

## 📁 Project Structure

```
indic-chat/
├── backend/
│   ├── app/
│   │   ├── routers/        # API endpoints (chat, quiz, analytics, auth)
│   │   ├── services/       # Core logic (RAG, translation, LLM, adaptive)
│   │   ├── models/         # SQLAlchemy models
│   │   ├── prompts/        # LLM prompt templates
│   │   └── data/           # Static data (language list, NCERT terms)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── components/     # Chat, quiz, dashboard, layout components
        ├── pages/          # ChatPage, QuizPage, DashboardPage
        ├── context/        # StudentContext (global state)
        ├── hooks/          # useStudentSession
        └── utils/          # Language helpers, quiz scoring
```

---

## 🔑 Key Implementation Highlights

- **Double-checked locking** on RAG initialization prevents race conditions on first load
- **LaTeX protection layer** — math expressions (`$...$`, `$$...$$`) are replaced with placeholders before translation and restored afterward, preventing NMT from corrupting formulas
- **Intent detection** distinguishes NCERT questions from greetings/off-topic queries before hitting the RAG pipeline
- **Weak topic tracking** — quiz submissions update a per-student topic score table; the adaptive engine weights question selection toward the lowest-scoring topics

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

<p align="center">Built as a Final Year Project — NLP · RAG · Multilingual AI · Adaptive Learning</p>
