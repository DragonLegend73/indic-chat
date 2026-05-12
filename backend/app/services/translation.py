"""
Translation Service — IndicTrans2 with term protection and caching.
Supports all 22 scheduled Indian languages ↔ English.
"""

import re
import json
import logging
import hashlib
import threading
import asyncio
from pathlib import Path
from typing import Optional
from functools import lru_cache
from collections import OrderedDict

from fastapi.concurrency import run_in_threadpool

import torch
from IndicTransToolkit.processor import IndicProcessor
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

logger = logging.getLogger("indic-chat.translation")

_translation_lock = threading.Lock()

class TranslationCache:
    """Simple LRU cache for translations."""
    def __init__(self, maxsize: int = 1000):
        self._cache: OrderedDict = OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> Optional[str]:
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key: str, value: str):
        if key in self._cache:
            self._cache.move_to_end(key)
        else:
            if len(self._cache) >= self._maxsize:
                self._cache.popitem(last=False)
        self._cache[key] = value

class TranslationService:
    """
    Translation using IndicTrans2 200M distilled models.
    Features:
    - Term protection dictionary (NCERT scientific/math terms)
    - Translation caching (LRU, 1000 entries)
    - Lazy model loading
    """

    PLACEHOLDER_PREFIX = "TERM_PLACEHOLDER_"

    def __init__(self):
        self._indic_to_en_model = None
        self._en_to_indic_model = None
        self._indic_to_en_tokenizer = None
        self._en_to_indic_tokenizer = None
        self._term_dict = self._load_term_dictionary()
        self._cache = TranslationCache(maxsize=1000)
        self._models_loaded = False
        self._semaphore = None
        self._ip = IndicProcessor(inference=True)

    async def translate_async(self, text: str, src_lang: str, tgt_lang: str) -> str:
        """Async wrapper for translation with a concurrency limiter."""
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(2)
            
        async with self._semaphore:
            return await run_in_threadpool(self.translate, text, src_lang, tgt_lang)

    def _load_term_dictionary(self) -> dict:
        """Load the NCERT term protection dictionary."""
        term_path = Path(__file__).parent.parent / "data" / "ncert_terms.json"
        try:
            with open(term_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            logger.warning("⚠️ ncert_terms.json not found, term protection disabled")
            return {}

    def _load_models(self):
        """Lazy-load IndicTrans2 models. Stable for transformers==4.39.3."""
        global _translation_lock
        if self._models_loaded:
            return

        with _translation_lock:
            if self._models_loaded:
                return

            try:
                from app.config import get_settings
                settings = get_settings()

                logger.info("Loading IndicTrans2 models (v4.39.3 stable path)...")
                device = "cuda" if torch.cuda.is_available() else "cpu"

                # --- Indic → English ---
                self._indic_to_en_tokenizer = AutoTokenizer.from_pretrained(
                    settings.INDICTRANS2_INDIC_EN_MODEL, trust_remote_code=True
                )
                self._indic_to_en_model = AutoModelForSeq2SeqLM.from_pretrained(
                    settings.INDICTRANS2_INDIC_EN_MODEL, 
                    trust_remote_code=True, 
                    torch_dtype=torch.float16 if device == "cuda" else torch.float32
                ).to(device)

                # --- English → Indic ---
                self._en_to_indic_tokenizer = AutoTokenizer.from_pretrained(
                    settings.INDICTRANS2_EN_INDIC_MODEL, trust_remote_code=True
                )
                self._en_to_indic_model = AutoModelForSeq2SeqLM.from_pretrained(
                    settings.INDICTRANS2_EN_INDIC_MODEL,
                    trust_remote_code=True,
                    torch_dtype=torch.float16 if device == "cuda" else torch.float32
                ).to(device)

                # Ensure weight tying is active (v4 handles this better)
                self._indic_to_en_model.tie_weights()
                self._en_to_indic_model.tie_weights()

                self._models_loaded = True
                logger.info("✅ IndicTrans2 models loaded successfully")
            except Exception as e:
                logger.error(f"❌ Failed to load IndicTrans2: {e}")
                raise

    def unload_models(self):
        """Release models from memory."""
        global _translation_lock
        with _translation_lock:
            if not self._models_loaded:
                return
            self._indic_to_en_model = None
            self._en_to_indic_model = None
            self._indic_to_en_tokenizer = None
            self._en_to_indic_tokenizer = None
            self._models_loaded = False
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info("✅ IndicTrans2 models unloaded")

    def _protect_terms(self, text: str, src_lang: str) -> tuple[str, dict]:
        replacements = {}
        modified = text
        for english_term, translations in self._term_dict.items():
            # 1. Protect English term (always check, as it might be in native text too)
            # Use regex word boundaries to avoid partial matches (e.g., base -> based)
            pattern = re.compile(r'\b' + re.escape(english_term) + r'\b', re.IGNORECASE)
            if pattern.search(modified):
                placeholder = f"{self.PLACEHOLDER_PREFIX}{len(replacements)}"
                modified = pattern.sub(placeholder, modified)
                replacements[placeholder] = english_term
                
            # 2. Protect native term if translating FROM that language
            if src_lang in translations:
                native_term = translations[src_lang]
                if native_term in modified:
                    placeholder = f"{self.PLACEHOLDER_PREFIX}{len(replacements)}"
                    # For Indic terms, we use direct string replacement as word boundaries are complex
                    modified = modified.replace(native_term, placeholder)
                    replacements[placeholder] = english_term
        return modified, replacements

    def _protect_latex(self, text: str) -> tuple[str, dict]:
        """Protect LaTeX blocks from translation."""
        replacements = {}
        # Pattern to match $$...$$, $...$, \(...\), \[...\]
        # Ordering is important: check $$ before $
        patterns = [
            r'\$\$.*?\$\$',
            r'\$.*?\$',
            r'\\\(.*?\\\)',
            r'\\\[.*?\\\]'
        ]
        
        modified = text
        for pattern_str in patterns:
            # We use non-greedy matching and DOTALL for multi-line support
            matches = re.findall(pattern_str, modified, flags=re.DOTALL)
            for match in matches:
                placeholder = f"LATEX_PLACEHOLDER_{len(replacements)}"
                # Use replace to be exact, but only once to avoid duplicate placeholders
                if match in modified:
                    modified = modified.replace(match, placeholder, 1)
                    replacements[placeholder] = match
        return modified, replacements

    def _restore_terms(self, text: str, replacements: dict, tgt_lang: str) -> str:
        """
        Restore placeholders with actual terms.
        Uses a robust regex to catch split placeholders like 'TERM _ PLACEHOLDER _ 0'.
        """
        # Pattern to match variations produced by different tokenizers
        # e.g., TERM_PLACEHOLDER_0, TERM _ PLACEHOLDER _ 0, TERM-PLACEHOLDER-0
        pattern = re.compile(r'TERM\s*[_ \-]*\s*PLACEHOLDER\s*[_ \-]*\s*(\d+)', re.IGNORECASE)
        
        def replace_match(match):
            pid = f"TERM_PLACEHOLDER_{match.group(1)}"
            english_term = replacements.get(pid)
            if not english_term:
                return match.group(0)
            
            if tgt_lang == "eng_Latn":
                return english_term
            
            # Map back to native term if not English
            translations = self._term_dict.get(english_term, {})
            return translations.get(tgt_lang, english_term)

        return pattern.sub(replace_match, text)

    def _restore_latex(self, text: str, replacements: dict) -> str:
        """Restore LaTeX blocks from placeholders."""
        # Handle potential spacing artifacts like 'LATEX _ PLACEHOLDER _ 0'
        pattern = re.compile(r'LATEX\s*[_ \-]*\s*PLACEHOLDER\s*[_ \-]*\s*(\d+)', re.IGNORECASE)
        
        def replace_match(match):
            pid = f"LATEX_PLACEHOLDER_{match.group(1)}"
            return replacements.get(pid, match.group(0))
            
        return pattern.sub(replace_match, text)

    def _polish_markdown(self, text: str) -> str:
        """
        Fixes common Markdown artifacts produced by split tokenization in Indic languages.
        - Collapses split markers: '* *' -> '**', '# #' -> '##'
        - Removes padding inside markers: '** bold **' -> '**bold**'
        - Strips non-breaking spaces (\xa0) that break LaTeX rendering.
        """
        if not text:
            return text
            
        # 1. Collapse split markers: match a marker followed by spaces and more markers
        # e.g., "* * *" -> "***", "# # " -> "## "
        text = re.sub(r'\*(\s+\*)+', lambda m: m.group(0).replace(' ', ''), text)
        text = re.sub(r'_(\s+_)+', lambda m: m.group(0).replace(' ', ''), text)
        text = re.sub(r'#(\s+#)+', lambda m: m.group(0).replace(' ', ''), text)

        # 2. Fix bold/italic padding inside markers: "** text **" -> "**text**"
        # This prevents over-consuming spaces outside the markers.
        text = re.sub(r'(\*\*|__)\s+(.*?)\s+(\1)', r'\1\2\3', text)

        # 3. Clean up non-breaking spaces (\xa0)
        # These are often injected by tokenizers or OCR and break KaTeX/LaTeX formatting.
        text = text.replace('\xa0', ' ')

        return text

    def translate(self, text: str, src_lang: str, tgt_lang: str) -> str:
        if src_lang == tgt_lang or not text.strip():
            return text
        cache_key = hashlib.md5(f"{text}:{src_lang}:{tgt_lang}".encode()).hexdigest()
        cached = self._cache.get(cache_key)
        if cached:
            return cached
            
        # 1. Protect LaTeX blocks first
        latex_protected, latex_replacements = self._protect_latex(text)
        
        # 2. Protect technical terms in the remaining text
        term_protected, term_replacements = self._protect_terms(latex_protected, src_lang)
        
        try:
            self._load_models()
            translated = self._translate_raw(term_protected, src_lang, tgt_lang)
        except Exception:
            logger.exception("Translation failed")
            return text
            
        # 3. Restore terms
        restored_terms = self._restore_terms(translated, term_replacements, tgt_lang)
        
        # 4. Restore LaTeX
        restored_latex = self._restore_latex(restored_terms, latex_replacements)
        
        # 5. Final polish
        polished = self._polish_markdown(restored_latex)
        
        self._cache.put(cache_key, polished)
        return polished

    def _translate_raw(self, text: str, src_lang: str, tgt_lang: str) -> str:
        if not text.strip():
            return text

        # Handle long text by splitting into chunks
        if len(text) > 400 and "\n" in text:
            chunks = text.split("\n")
            return "\n".join([self._translate_raw(c, src_lang, tgt_lang) if c.strip() else "" for c in chunks])

        if tgt_lang == "eng_Latn":
            tokenizer = self._indic_to_en_tokenizer
            model = self._indic_to_en_model
        elif src_lang == "eng_Latn":
            tokenizer = self._en_to_indic_tokenizer
            model = self._en_to_indic_model
        else:
            # Pivot through English for Indic-to-Indic
            english = self._translate_raw(text, src_lang, "eng_Latn")
            return self._translate_raw(english, "eng_Latn", tgt_lang)

        # 1. Preprocess with IndicProcessor
        # Note: IndicProcessor expectation matches our eng_Latn/hin_Deva format
        batch = [text]
        preprocessed_batch = self._ip.preprocess_batch(batch, src_lang=src_lang, tgt_lang=tgt_lang)

        # 2. Tokenize
        inputs = tokenizer(
            preprocessed_batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        ).to(model.device)

        # 3. Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                num_beams=5,
                use_cache=True,
            )

        # 4. Decode and Postprocess
        decoded_tokens = tokenizer.batch_decode(outputs, skip_special_tokens=True, clean_up_tokenization_spaces=True)
        postprocessed_batch = self._ip.postprocess_batch(decoded_tokens, lang=tgt_lang)
        
        return postprocessed_batch[0].strip()

_translation_service: Optional[TranslationService] = None

def get_translation_service() -> TranslationService:
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
