from __future__ import annotations

import os
from functools import lru_cache


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/insurance")
    storage_dir: str = os.getenv("STORAGE_DIR", "./var/documents")
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    embed_provider: str = os.getenv("EMBED_PROVIDER", "mock")
    # Strict Evidence Mode is a product default, not a prompt (spec §9).
    strict_evidence_default: bool = os.getenv("STRICT_EVIDENCE", "1") == "1"
    max_upload_mb: int = int(os.getenv("MAX_UPLOAD_MB", "50"))


@lru_cache
def settings() -> Settings:
    return Settings()
