"""
LLM Service — Provider abstraction for Gemma 4 E2B (Ollama), OpenRouter, and Groq.
Supports streaming, thinking mode, and automatic fallback.
"""

import logging
import json
import httpx
from typing import AsyncGenerator, Optional
from app.config import get_settings

logger = logging.getLogger("indic-chat.llm")
settings = get_settings()


class LLMService:
    """
    Provider-agnostic LLM service.
    Primary: Gemma 4 E2B via Ollama (local)
    Fallback: OpenRouter or Groq (free cloud tiers)
    """

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self._client = httpx.AsyncClient(timeout=120.0)

    async def generate(
        self,
        prompt: str,
        system: str = "",
        thinking: bool = False,
        max_tokens: int = 4096,
    ) -> str:
        """Generate a complete response (non-streaming)."""
        if thinking:
            prompt = f"<|think|>\n{prompt}"

        try:
            return await self._dispatch(prompt, system, max_tokens)
        except Exception as e:
            logger.warning(f"Primary LLM ({self.provider}) failed: {e}. Trying fallback...")
            return await self._fallback_generate(prompt, system, max_tokens)

    async def generate_stream(
        self,
        prompt: str,
        system: str = "",
        thinking: bool = False,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Stream tokens one at a time. Yields text chunks."""
        if thinking:
            prompt = f"<|think|>\n{prompt}"

        try:
            async for chunk in self._dispatch_stream(prompt, system, max_tokens):
                yield chunk
        except Exception as e:
            logger.warning(f"Streaming LLM ({self.provider}) failed: {e}. Trying fallback...")
            async for chunk in self._fallback_stream(prompt, system, max_tokens):
                yield chunk

    # --- Provider Dispatch ---

    async def _dispatch(self, prompt: str, system: str, max_tokens: int) -> str:
        match self.provider:
            case "ollama":
                return await self._ollama_generate(prompt, system, max_tokens)
            case "openrouter":
                return await self._openai_compatible_generate(
                    settings.OPENROUTER_BASE_URL,
                    settings.OPENROUTER_API_KEY,
                    settings.OPENROUTER_MODEL,
                    prompt, system, max_tokens,
                )
            case "groq":
                return await self._openai_compatible_generate(
                    settings.GROQ_BASE_URL,
                    settings.GROQ_API_KEY,
                    settings.GROQ_MODEL,
                    prompt, system, max_tokens,
                )
            case _:
                return await self._ollama_generate(prompt, system, max_tokens)

    async def _dispatch_stream(self, prompt: str, system: str, max_tokens: int) -> AsyncGenerator[str, None]:
        match self.provider:
            case "ollama":
                async for chunk in self._ollama_stream(prompt, system, max_tokens):
                    yield chunk
            case "openrouter":
                async for chunk in self._openai_compatible_stream(
                    settings.OPENROUTER_BASE_URL,
                    settings.OPENROUTER_API_KEY,
                    settings.OPENROUTER_MODEL,
                    prompt, system, max_tokens,
                ):
                    yield chunk
            case "groq":
                async for chunk in self._openai_compatible_stream(
                    settings.GROQ_BASE_URL,
                    settings.GROQ_API_KEY,
                    settings.GROQ_MODEL,
                    prompt, system, max_tokens,
                ):
                    yield chunk
            case _:
                async for chunk in self._ollama_stream(prompt, system, max_tokens):
                    yield chunk

    # --- Ollama ---

    async def _ollama_generate(self, prompt: str, system: str, max_tokens: int) -> str:
        """Generate using local Ollama server."""
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "num_ctx": 1024
            },
        }
        resp = await self._client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "")

    async def _ollama_stream(self, prompt: str, system: str, max_tokens: int) -> AsyncGenerator[str, None]:
        """Stream from local Ollama server."""
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "system": system,
            "stream": True,
            "options": {
                "num_predict": max_tokens,
                "num_ctx": 1024
            },
        }
        async with self._client.stream(
            "POST", f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.strip():
                    data = json.loads(line)
                    token = data.get("response", "")
                    if token:
                        yield token
                    if data.get("done", False):
                        break

    # --- OpenAI-Compatible (OpenRouter, Groq) ---

    async def _openai_compatible_generate(
        self, base_url: str, api_key: str, model: str,
        prompt: str, system: str, max_tokens: int,
    ) -> str:
        """Generate using OpenAI-compatible API."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": False,
        }
        resp = await self._client.post(
            f"{base_url}/chat/completions", json=payload, headers=headers
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    async def _openai_compatible_stream(
        self, base_url: str, api_key: str, model: str,
        prompt: str, system: str, max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """Stream from OpenAI-compatible API."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": True,
        }
        async with self._client.stream(
            "POST", f"{base_url}/chat/completions", json=payload, headers=headers
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    data = json.loads(data_str)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    token = delta.get("content", "")
                    if token:
                        yield token

    # --- Fallback Chain ---

    async def _fallback_generate(self, prompt: str, system: str, max_tokens: int) -> str:
        """Try fallback providers in order."""
        fallbacks = []
        if self.provider != "openrouter" and settings.OPENROUTER_API_KEY:
            fallbacks.append(("openrouter", settings.OPENROUTER_BASE_URL, settings.OPENROUTER_API_KEY, settings.OPENROUTER_MODEL))
        if self.provider != "groq" and settings.GROQ_API_KEY:
            fallbacks.append(("groq", settings.GROQ_BASE_URL, settings.GROQ_API_KEY, settings.GROQ_MODEL))

        for name, base_url, api_key, model in fallbacks:
            try:
                logger.info(f"Trying fallback: {name}")
                return await self._openai_compatible_generate(base_url, api_key, model, prompt, system, max_tokens)
            except Exception as e:
                logger.warning(f"Fallback {name} also failed: {e}")

        return "I'm sorry, all AI providers are currently unavailable. Please try again later."

    async def _fallback_stream(self, prompt: str, system: str, max_tokens: int) -> AsyncGenerator[str, None]:
        """Try fallback providers for streaming."""
        fallbacks = []
        if self.provider != "openrouter" and settings.OPENROUTER_API_KEY:
            fallbacks.append(("openrouter", settings.OPENROUTER_BASE_URL, settings.OPENROUTER_API_KEY, settings.OPENROUTER_MODEL))
        if self.provider != "groq" and settings.GROQ_API_KEY:
            fallbacks.append(("groq", settings.GROQ_BASE_URL, settings.GROQ_API_KEY, settings.GROQ_MODEL))

        for name, base_url, api_key, model in fallbacks:
            try:
                logger.info(f"Trying streaming fallback: {name}")
                async for chunk in self._openai_compatible_stream(base_url, api_key, model, prompt, system, max_tokens):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Streaming fallback {name} failed: {e}")

        yield "I'm sorry, all AI providers are currently unavailable. Please try again later."

    async def close(self):
        """Clean up HTTP client."""
        await self._client.aclose()


# Singleton
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
