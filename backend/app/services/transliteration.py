"""
Transliteration Service — IndicXlit wrapper.
Converts romanized Indian language text to native script.
Graceful passthrough on failure.
"""

import logging
from typing import Optional

logger = logging.getLogger("indic-chat.transliteration")


class TransliterationService:
    """
    IndicXlit: converts romanized text (e.g., "namaste") to native script ("नमस्ते").
    Supports 21 Indic languages.
    Falls back to passthrough if IndicXlit is unavailable.
    """

    def __init__(self):
        self._xlit = None
        self._available = False

    def _load(self):
        """Lazy-load IndicXlit."""
        if self._xlit is not None:
            return self._available
        try:
            from ai4bharat.transliteration import XlitEngine
            self._xlit = XlitEngine(beam_width=4, src_script_type="roman")
            self._available = True
            logger.info("✅ IndicXlit loaded")
        except ImportError:
            logger.warning("⚠️ IndicXlit not installed. Install ai4bharat-transliteration package.")
            self._available = False
        except Exception as e:
            logger.warning(f"⚠️ IndicXlit failed to load: {e}")
            self._available = False
        return self._available

    def transliterate(self, text: str, target_lang: str = "hi") -> str:
        """
        Transliterate romanized text to native script.

        Args:
            text: Romanized text (e.g., "algebra kya hai")
            target_lang: Target language ISO code (e.g., "hi" for Hindi)

        Returns:
            Native script text, or original text if transliteration fails.
        """
        if not text.strip():
            return text

        if not self._load():
            return text  # Graceful passthrough

        try:
            # IndicXlit expects ISO 639-1 codes
            lang_map = {
                "hin_Deva": "hi", "ben_Beng": "bn", "tam_Taml": "ta",
                "tel_Telu": "te", "kan_Knda": "kn", "mal_Mlym": "ml",
                "mar_Deva": "mr", "guj_Gujr": "gu", "pan_Guru": "pa",
                "ory_Orya": "or", "asm_Beng": "as", "urd_Arab": "ur",
                "npi_Deva": "ne", "san_Deva": "sa", "mai_Deva": "mai",
                "brx_Deva": "brx", "doi_Deva": "doi", "gom_Deva": "gom",
                "kas_Deva": "ks", "snd_Deva": "sd", "mni_Beng": "mni",
            }
            iso_code = lang_map.get(target_lang, target_lang)

            result = self._xlit.translit_sentence(text, iso_code)
            return result if result else text
        except Exception as e:
            logger.warning(f"Transliteration failed for '{text[:50]}...': {e}")
            return text  # Graceful passthrough


# Singleton
_transliteration_service: Optional[TransliterationService] = None


def get_transliteration_service() -> TransliterationService:
    global _transliteration_service
    if _transliteration_service is None:
        _transliteration_service = TransliterationService()
    return _transliteration_service
