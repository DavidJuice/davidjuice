from __future__ import annotations

import os
from functools import lru_cache

from .mock import MockProvider


@lru_cache(maxsize=None)
def get_provider(name: str | None = None):
    """LLM_PROVIDER=mock|anthropic|openai. Defaults to mock so nothing in the repo
    requires an API key to run (spec §54.13/14)."""
    name = (name or os.getenv("LLM_PROVIDER", "mock")).lower()
    if name == "anthropic":
        from .anthropic_provider import AnthropicProvider
        return AnthropicProvider()
    if name == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider()
    return MockProvider()


@lru_cache(maxsize=None)
def get_embedder(name: str | None = None):
    """Embeddings are a separate choice from the reasoning provider: Anthropic has no
    embedding endpoint, and switching embedding models invalidates the whole index."""
    name = (name or os.getenv("EMBED_PROVIDER", "mock")).lower()
    if name == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider()
    return MockProvider()


EMBED_DIM = 1536
