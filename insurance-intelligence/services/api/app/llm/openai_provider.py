from __future__ import annotations

import json
import os
import time

from .base import LLMResult
from . import prompts


class OpenAIProvider:
    name = "openai"

    def __init__(self, cheap: str | None = None, capable: str | None = None):
        from openai import OpenAI
        self._c = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self.cheap = cheap or os.getenv("OPENAI_CHEAP_MODEL", "gpt-4.1-mini")
        self.capable = capable or os.getenv("OPENAI_CAPABLE_MODEL", "gpt-4.1")
        self.embed_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

    def _json(self, model: str, system: str, user: str) -> LLMResult:
        t0 = time.time()
        r = self._c.chat.completions.create(
            model=model, response_format={"type": "json_object"},
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": user}])
        return LLMResult(json.loads(r.choices[0].message.content), self.name, model,
                         int((time.time() - t0) * 1000))

    def classify_document(self, first_pages: str) -> LLMResult:
        return self._json(self.cheap, prompts.CLASSIFY, first_pages[:20000])

    def extract_structured_data(self, page_text: str, page_number: int, fields) -> LLMResult:
        user = (f"FIELD VOCABULARY (use only these codes):\n{json.dumps(fields)}\n\n"
                f"PAGE {page_number}:\n{page_text}")
        return self._json(self.capable, prompts.EXTRACT, user)

    def interpret_query(self, question: str, vocabulary) -> LLMResult:
        return self._json(self.cheap, prompts.INTERPRET,
                          f"VOCABULARY:\n{json.dumps(vocabulary)}\n\nQUESTION:\n{question}")

    def summarize_evidence(self, question: str, passages) -> LLMResult:
        body = "\n\n".join(
            f"[{i}] (doc={p.get('document_id')} page={p.get('page_number')})\n{p['text']}"
            for i, p in enumerate(passages))
        return self._json(self.capable, prompts.SUMMARIZE,
                          f"QUESTION:\n{question}\n\nPASSAGES:\n{body}")

    def translate(self, text: str, target: str) -> LLMResult:
        t0 = time.time()
        r = self._c.chat.completions.create(
            model=self.cheap,
            messages=[{"role": "system", "content":
                       f"Translate to {target}. Output only the translation. Never "
                       f"translate currency amounts, plan IDs or contract numbers."},
                      {"role": "user", "content": text}])
        return LLMResult({"text": r.choices[0].message.content}, self.name, self.cheap,
                         int((time.time() - t0) * 1000))

    def embed(self, texts: list[str]) -> list[list[float]]:
        r = self._c.embeddings.create(model=self.embed_model, input=texts)
        return [d.embedding for d in r.data]
