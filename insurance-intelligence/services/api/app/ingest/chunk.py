"""Page-anchored chunking. A chunk never spans pages, so every retrieved passage has an
unambiguous page citation (spec §30)."""
from __future__ import annotations

import re
from dataclasses import dataclass

from .pdf import Page

TARGET_CHARS = 1200
OVERLAP_CHARS = 150
_HEADING = re.compile(r"^[A-Z][A-Za-z0-9 /&'\-,()]{3,70}$")


def _section_of(lines: list[str]) -> str | None:
    for ln in lines:
        s = ln.strip()
        if _HEADING.match(s) and not s.endswith("."):
            return s
    return None


@dataclass
class Chunk:
    page_number: int
    chunk_index: int
    section: str | None
    text: str


def chunk_pages(pages: list[Page]) -> list[Chunk]:
    chunks: list[Chunk] = []
    idx = 0
    for page in pages:
        lines = page.text.splitlines()
        section = _section_of(lines)
        buf: list[str] = []
        size = 0
        for ln in lines:
            buf.append(ln)
            size += len(ln) + 1
            if size >= TARGET_CHARS:
                text = "\n".join(buf)
                chunks.append(Chunk(page.page_number, idx, section, text))
                idx += 1
                tail = text[-OVERLAP_CHARS:]
                buf = [tail]
                size = len(tail)
        if "".join(buf).strip():
            chunks.append(Chunk(page.page_number, idx, section, "\n".join(buf)))
            idx += 1
    return chunks
