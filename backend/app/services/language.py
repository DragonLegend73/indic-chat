"""
Language Detection Service — IndicLID with langdetect fallback.
Maps detected languages to IndicTrans2 language codes.
"""

import logging
import threading
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger("indic-chat.language")

_language_lock = threading.Lock()


@dataclass
class DetectionResult:
    language: str       # IndicTrans2 code: "hin_Deva", "eng_Latn", etc.
    confidence: float   # 0.0 - 1.0
    is_romanized: bool  # Was the original input romanized?
    raw_label: str      # Raw label from the detector


# Mapping from IndicLID labels to IndicTrans2 codes
INDICLID_TO_INDICTRANS = {
    "asm": "asm_Beng", "as": "asm_Beng",
    "ben": "ben_Beng", "bn": "ben_Beng",
    "brx": "brx_Deva",
    "doi": "doi_Deva",
    "eng": "eng_Latn", "en": "eng_Latn",
    "gom": "gom_Deva",
    "guj": "guj_Gujr", "gu": "guj_Gujr",
    "hin": "hin_Deva", "hi": "hin_Deva",
    "kan": "kan_Knda", "kn": "kan_Knda",
    "kas": "kas_Arab",
    "mai": "mai_Deva",
    "mal": "mal_Mlym", "ml": "mal_Mlym",
    "mni": "mni_Beng",
    "mar": "mar_Deva", "mr": "mar_Deva",
    "npi": "npi_Deva", "ne": "npi_Deva",
    "ory": "ory_Orya", "or": "ory_Orya",
    "pan": "pan_Guru", "pa": "pan_Guru",
    "san": "san_Deva", "sa": "san_Deva",
    "sat": "sat_Olck",
    "snd": "snd_Arab", "sd": "snd_Arab",
    "tam": "tam_Taml", "ta": "tam_Taml",
    "tel": "tel_Telu", "te": "tel_Telu",
    "urd": "urd_Arab", "ur": "urd_Arab",
}


class LanguageService:
    """
    Language detection using IndicLID (primary) with langdetect (fallback).
    IndicLID supports 47 classes: 22 native-script + 21 romanized + English + Other.
    """

    def __init__(self):
        self._indiclid = None
        self._langdetect_available = False
        self._load_fallback()

    def _load_fallback(self):
        """Load langdetect as fallback."""
        try:
            import langdetect
            self._langdetect_available = True
            logger.info("✅ langdetect fallback available")
        except ImportError:
            logger.warning("⚠️ langdetect not installed, no fallback for IndicLID")

    def _load_indiclid(self):
        """Lazy-load IndicLID model."""
        global _language_lock
        if self._indiclid is not None:
            return True
        
        with _language_lock:
            if self._indiclid is not None:
                return True

            try:
                # Try to load IndicLID FastText model
                import fasttext
                from app.config import get_settings
                settings = get_settings()
                model_path = f"{settings.INDICLID_MODEL_PATH}/indiclid-ftn/model_baseline_roman.bin"
                self._indiclid = fasttext.load_model(model_path)
                logger.info("✅ IndicLID loaded")
                return True
            except ImportError:
                logger.warning("⚠️ IndicLID (fasttext) not installed. Install with 'pip install fasttext' (requires gcc/g++). Using langdetect fallback.")
                return False
            except Exception as e:
                logger.warning(f"⚠️ IndicLID could not load: {e}. Using langdetect fallback.")
                return False

    def detect(self, text: str) -> DetectionResult:
        """
        Detect the language of the input text.
        Returns an IndicTrans2-compatible language code.
        """
        text = text.strip()
        if not text:
            return DetectionResult("eng_Latn", 0.0, False, "empty")

        # Try IndicLID first
        if self._load_indiclid():
            try:
                return self._detect_indiclid(text)
            except Exception as e:
                logger.warning(f"IndicLID detection failed: {e}")

        # Fallback to langdetect
        if self._langdetect_available:
            return self._detect_langdetect(text)

        # Ultimate fallback: assume English
        logger.warning("No language detector available, defaulting to English")
        return DetectionResult("eng_Latn", 0.5, False, "fallback")

    def _detect_indiclid(self, text: str) -> DetectionResult:
        """Detect using IndicLID FastText model."""
        predictions = self._indiclid.predict(text.replace("\n", " "), k=1)
        label = predictions[0][0].replace("__label__", "")
        confidence = float(predictions[1][0])

        # Check if romanized (IndicLID label format: "hin_roman" or "hin_native")
        is_romanized = "_roman" in label.lower() or "_latn" in label.lower()
        lang_base = label.split("_")[0].lower()

        lang_code = INDICLID_TO_INDICTRANS.get(lang_base, "eng_Latn")

        return DetectionResult(
            language=lang_code,
            confidence=confidence,
            is_romanized=is_romanized,
            raw_label=label,
        )

    def _detect_langdetect(self, text: str) -> DetectionResult:
        """Detect using langdetect (simpler, fewer languages)."""
        import langdetect
        try:
            results = langdetect.detect_langs(text)
            if results:
                top = results[0]
                lang_code = INDICLID_TO_INDICTRANS.get(top.lang, "eng_Latn")
                return DetectionResult(
                    language=lang_code,
                    confidence=top.prob,
                    is_romanized=False,
                    raw_label=top.lang,
                )
        except langdetect.LangDetectException:
            pass

        return DetectionResult("eng_Latn", 0.5, False, "langdetect_fallback")


# Singleton
_language_service: Optional[LanguageService] = None


def get_language_service() -> LanguageService:
    global _language_service
    if _language_service is None:
        _language_service = LanguageService()
    return _language_service
