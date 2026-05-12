"""
Indic-Chat Configuration — Pydantic Settings
Loads from .env file with sensible defaults.
"""

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- LLM Provider ---
    LLM_PROVIDER: str = "ollama"
    OLLAMA_MODEL: str = "gemma4:e2b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "meta-llama/llama-3.2-3b-instruct:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # --- Teacher Dashboard Auth ---
    TEACHER_PASSWORD: str = "admin"
    JWT_SECRET: str = "change-this-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # --- Database ---
    SQLITE_DB_URL: str = "sqlite+aiosqlite:///./data/indic_chat.db"

    # --- RAG ---
    CHROMA_DB_PATH: str = "./data/chroma_db"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_MODEL_MULTILINGUAL: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    RAG_TOP_K: int = 5
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    # --- AI4Bharat ---
    INDICLID_MODEL_PATH: str = "./models/indiclid"
    INDICTRANS2_EN_INDIC_MODEL: str = "ai4bharat/indictrans2-en-indic-dist-200M"
    INDICTRANS2_INDIC_EN_MODEL: str = "ai4bharat/indictrans2-indic-en-dist-200M"

    # --- Rate Limiting ---
    RATE_LIMIT: str = "10/minute"

    # --- App ---
    APP_ENV: str = "development"
    DEMO_MODE: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- Supported Languages ---
    # IndicTrans2 language codes
    SUPPORTED_LANGUAGES: list[str] = [
        "asm_Beng", "ben_Beng", "brx_Deva", "doi_Deva", "eng_Latn",
        "gom_Deva", "guj_Gujr", "hin_Deva", "kan_Knda", "kas_Arab",
        "kas_Deva", "mai_Deva", "mal_Mlym", "mni_Beng", "mni_Mtei",
        "mar_Deva", "npi_Deva", "ory_Orya", "pan_Guru", "san_Deva",
        "sat_Olck", "snd_Arab", "snd_Deva", "tam_Taml", "tel_Telu",
        "urd_Arab",
    ]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
