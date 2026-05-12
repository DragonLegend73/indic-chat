"""
Indic-Chat — FastAPI Application Entry Point
Configures CORS, lifespan events, rate limiting, and mounts all routers.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.models.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("indic-chat")

settings = get_settings()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting Indic-Chat server...")
    
    # Initialize database
    await init_db()
    logger.info("✅ Database initialized (WAL mode)")
    
    # Pre-warm models sequentially to prevent high memory peaks
    import os
    if os.environ.get("SKIP_PREWARM") == "true":
        logger.info("⚡ Skipping heavy model pre-warming (--fast mode active). Models will load lazily.")
    else:
        logger.info("📦 Pre-warming models (this may take a few minutes)...")
        try:
            from app.services.translation import get_translation_service
            from app.services.rag import get_rag_service
            from app.services.language import get_language_service
            
            # Load language detector first (lightest)
            get_language_service()._load_indiclid()
            
            # Load RAG embeddings (medium)
            get_rag_service()._load()
            
            # Load Translation models (heavy)
            get_translation_service()._load_models()
            
            logger.info("✅ All models pre-loaded successfully")
        except Exception as e:
            logger.error(f"⚠️ Model pre-warming encountered an error (will retry lazily): {e}")
    
    if settings.DEMO_MODE:
        logger.info("🎮 Demo mode enabled — using pre-seeded data")
    
    logger.info(f"🤖 LLM Provider: {settings.LLM_PROVIDER} ({settings.OLLAMA_MODEL})")
    logger.info(f"🌐 Supported languages: {len(settings.SUPPORTED_LANGUAGES)}")
    logger.info("✅ Indic-Chat ready!")
    
    yield
    
    logger.info("👋 Shutting down Indic-Chat...")
    
    # Gracefully remove models from memory so Uvicorn restarts don't stack up RAM
    try:
        from app.services.translation import get_translation_service
        get_translation_service().unload_models()
    except Exception as e:
        logger.error(f"Error unloading models: {e}")


# Create FastAPI app
app = FastAPI(
    title="Indic-Chat",
    description="Multilingual Adaptive AI Tutoring System for Indian Learners",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Global Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


# --- Mount Routers ---
from app.routers import health, languages, chat, quiz, students, auth, analytics

app.include_router(health.router, prefix="/api", tags=["System"])
app.include_router(languages.router, prefix="/api", tags=["Languages"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(quiz.router, prefix="/api", tags=["Quiz"])
app.include_router(students.router, prefix="/api", tags=["Students"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])


@app.get("/")
async def root():
    return {
        "name": "Indic-Chat",
        "version": "1.0.0",
        "description": "Multilingual Adaptive AI Tutoring System",
        "docs": "/docs",
        "languages": len(settings.SUPPORTED_LANGUAGES),
    }
