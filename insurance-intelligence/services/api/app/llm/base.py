"""Model-provider abstraction (spec §18). No provider-specific type escapes this module."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class LLMResult:
    data: Any
    provider: str
    model: str
    latency_ms: int


class LLMProvider(Protocol):
    name: str

    def classify_document(self, first_pages: str) -> LLMResult: ...
    def extract_structured_data(self, page_text: str, page_number: int,
                                fields: list[dict]) -> LLMResult: ...
    def interpret_query(self, question: str, vocabulary: list[dict]) -> LLMResult: ...
    def summarize_evidence(self, question: str, passages: list[dict]) -> LLMResult: ...
    def translate(self, text: str, target: str) -> LLMResult: ...
    def embed(self, texts: list[str]) -> list[list[float]]: ...


# Tasks are routed to a cost tier, not to a vendor (spec §48).
TASK_TIER = {
    "classify_document": "cheap",
    "translate": "cheap",
    "interpret_query": "cheap",
    "extract_structured_data": "capable",
    "summarize_evidence": "capable",
}
