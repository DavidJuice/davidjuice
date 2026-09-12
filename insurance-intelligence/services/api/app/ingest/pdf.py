"""Deterministic PDF text extraction with page + block geometry (spec §46).

Geometry is kept because benefit grids are multi-column: the x-range of the text block
that produced a value is the only signal available for detecting a column-shift error
(risks R5). OCR is detected, not performed, in the MVP.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class Block:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass
class Page:
    page_number: int
    text: str
    blocks: list[Block]
    needs_ocr: bool

    def as_row(self) -> dict[str, Any]:
        return {"page_number": self.page_number, "text": self.text,
                "blocks": [asdict(b) for b in self.blocks]}


MIN_CHARS_FOR_TEXT_LAYER = 40


def parse_pdf(path: str) -> list[Page]:
    import fitz  # PyMuPDF

    pages: list[Page] = []
    with fitz.open(path) as doc:
        for i, page in enumerate(doc, start=1):
            raw = page.get_text("blocks")  # (x0,y0,x1,y1,text,block_no,block_type)
            blocks = [Block(text=b[4].strip(), x0=b[0], y0=b[1], x1=b[2], y1=b[3])
                      for b in raw if b[4] and b[4].strip()]
            blocks.sort(key=lambda b: (round(b.y0, 1), b.x0))
            text = "\n".join(b.text for b in blocks)
            pages.append(Page(i, text, blocks,
                              needs_ocr=len(text.strip()) < MIN_CHARS_FOR_TEXT_LAYER))
    return pages


def normalize(s: str) -> str:
    """Whitespace-insensitive normalization used by the source-anchor check.

    PDF extraction collapses and re-splits whitespace unpredictably, so an exact
    substring test on raw text produces false rejections. Everything else - digits,
    currency, casing of the quoted excerpt - is compared literally.
    """
    return " ".join(s.split()).replace(" ", " ").strip()


def find_block_for(page: Page, source_text: str) -> Block | None:
    needle = normalize(source_text)
    for b in page.blocks:
        if needle and needle in normalize(b.text):
            return b
    return None
