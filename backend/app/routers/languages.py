"""
Languages Router — Exposes supported language metadata.
"""

import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()

# Load language data
_LANGUAGES_FILE = Path(__file__).parent.parent / "data" / "languages.json"
_languages_cache = None


def _load_languages() -> list[dict]:
    global _languages_cache
    if _languages_cache is None:
        with open(_LANGUAGES_FILE, "r", encoding="utf-8") as f:
            _languages_cache = json.load(f)
    return _languages_cache


@router.get("/languages")
async def list_languages():
    """
    Get all supported languages with metadata.
    Used by the frontend LanguageSelector component.
    """
    languages = _load_languages()
    return {
        "total": len(languages),
        "languages": languages,
    }


@router.get("/languages/{code}")
async def get_language(code: str):
    """Get metadata for a specific language by code."""
    languages = _load_languages()
    for lang in languages:
        if lang["code"] == code:
            return lang
    return {"error": f"Language '{code}' not found"}
