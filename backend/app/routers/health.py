"""
Health Check Router — Reports status of all services.
"""

from fastapi import APIRouter
import logging

logger = logging.getLogger("indic-chat.health")
router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Check the health of all system components.
    Returns status of each service for monitoring.
    """
    health = {
        "status": "ok",
        "services": {}
    }

    # 1. Check Ollama
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                health["services"]["ollama"] = {
                    "status": "ok",
                    "models": model_names,
                }
            else:
                health["services"]["ollama"] = {"status": "error", "detail": f"HTTP {resp.status_code}"}
    except Exception as e:
        health["services"]["ollama"] = {"status": "unreachable", "detail": str(e)}

    # 2. Check SQLite
    try:
        from app.models.database import async_session_factory
        from sqlalchemy import text
        async with async_session_factory() as session:
            result = await session.execute(text("SELECT 1"))
            result.scalar()
        health["services"]["sqlite"] = {"status": "ok"}
    except Exception as e:
        health["services"]["sqlite"] = {"status": "error", "detail": str(e)}

    # 3. Check ChromaDB
    try:
        import chromadb
        from app.config import get_settings
        settings = get_settings()
        client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        collections = client.list_collections()
        col_info = {}
        for col in collections:
            col_info[col.name] = col.count()
        health["services"]["chromadb"] = {
            "status": "ok",
            "collections": col_info,
        }
    except Exception as e:
        health["services"]["chromadb"] = {"status": "error", "detail": str(e)}

    # Set overall status
    statuses = [s.get("status") for s in health["services"].values()]
    if all(s == "ok" for s in statuses):
        health["status"] = "healthy"
    elif any(s == "ok" for s in statuses):
        health["status"] = "degraded"
    else:
        health["status"] = "unhealthy"

    return health
