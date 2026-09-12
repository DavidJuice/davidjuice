from __future__ import annotations

import json
import os
import time

from .base import LLMResult
from . import prompts


class AnthropicProvider:
    """Anthropic implementation. Models are configurable; defaults follow the
    cheap/capable split in spec §48."""
    name = "anthropic"

    def __init__(self, cheap: str | None = None, capable: str | None = None):
        from anthropic import Anthropic  # imported lazily so tests need no SDK
        self._c = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        self.cheap = cheap or os.getenv("LLM_CHEAP_MODEL", "claude-haiku-4-5-20251001")
        self.capable = capable or os.getenv("LLM_CAPABLE_MODEL", "claude-sonnet-5")

    def _json(self, model: str, system: str, user: str, max_tokens: int = 4096) -> LLMResult:
        t0 = time.time()
        r = self._c.messages.create(
            model=model, max_tokens=max_tokens, system=system,
            messages=[{"role": "user", "content": user},
                      {"role": "assistant", "content": "{"}],
        )
        raw = "{" + r.content[0].text
        return LLMResult(json.loads(raw), self.name, model, int((time.time() - t0) * 1000))

    def classify_document(self, first_pages: str) -> LLMResult:
        return self._json(self.cheap, prompts.CLASSIFY, first_pages[:20000], 1024)

    def extract_structured_data(self, page_text: str, page_number: int, fields) -> LLMResult:
        user = (f"FIELD VOCABULARY (use only these codes):\n{json.dumps(fields)}\n\n"
                f"PAGE {page_number}:\n{page_text}")
        return self._json(self.capable, prompts.EXTRACT, user, 8192)

    def interpret_query(self, question: str, vocabulary) -> LLMResult:
        user = f"VOCABULARY:\n{json.dumps(vocabulary)}\n\nQUESTION:\n{question}"
        return self._json(self.cheap, prompts.INTERPRET, user, 2048)

    def summarize_evidence(self, question: str, passages) -> LLMResult:
        body = "\n\n".join(
            f"[{i}] (doc={p.get('document_id')} page={p.get('page_number')})\n{p['text']}"
            for i, p in enumerate(passages))
        return self._json(self.capable, prompts.SUMMARIZE,
                          f"QUESTION:\n{question}\n\nPASSAGES:\n{body}", 2048)

    def translate(self, text: str, target: str) -> LLMResult:
        t0 = time.time()
        r = self._c.messages.create(
            model=self.cheap, max_tokens=1024,
            system=f"Translate to {target}. Output only the translation. "
                   f"Never translate currency amounts, plan IDs or contract numbers.",
            messages=[{"role": "user", "content": text}])
        return LLMResult({"text": r.content[0].text}, self.name, self.cheap,
                         int((time.time() - t0) * 1000))

    def embed(self, texts: list[str]) -> list[list[float]]:
        # Anthropic exposes no embedding endpoint; embeddings always come from the
        # configured embedding provider (see registry.get_embedder).
        raise NotImplementedError
