"""Page-by-page extraction with mandatory provenance (spec §20)."""
from __future__ import annotations

from dataclasses import dataclass

from ..llm.base import LLMProvider
from ..ontology.fields import MVP_FIELDS
from .pdf import Page, find_block_for
from .validate import Verdict, validate_fact


def field_vocabulary() -> list[dict]:
    return [{"code": f.code, "label": f.label_en, "value_kind": f.value_kind,
             "allowed_frequencies": list(f.allowed_frequencies), "notes": f.notes}
            for f in MVP_FIELDS]


@dataclass
class CandidateFact:
    fact: dict
    page_number: int
    verdict: Verdict
    bbox: dict | None


def extract_page(provider: LLMProvider, page: Page, *, plan_year: int,
                 document_plan_year: int | None) -> list[CandidateFact]:
    res = provider.extract_structured_data(page.text, page.page_number, field_vocabulary())
    out: list[CandidateFact] = []
    for f in res.data.get("facts", []):
        verdict = validate_fact(f, plan_year=plan_year,
                                document_plan_year=document_plan_year,
                                page_text=page.text)
        blk = find_block_for(page, f.get("source_text", ""))
        out.append(CandidateFact(
            fact={**f, "extracted_by_model": f"{res.provider}:{res.model}"},
            page_number=page.page_number, verdict=verdict,
            bbox={"x0": blk.x0, "y0": blk.y0, "x1": blk.x1, "y1": blk.y1} if blk else None,
        ))
    return out


def dedupe_and_flag_conflicts(cands: list[CandidateFact]) -> tuple[list[CandidateFact],
                                                                  list[tuple[CandidateFact, CandidateFact]]]:
    """Collapse identical repeats; surface genuine disagreements.

    Nothing is auto-resolved. Both sides of a conflict are kept and marked (spec §10).
    """
    from .validate import same_value

    kept: dict[tuple, CandidateFact] = {}
    conflicts: list[tuple[CandidateFact, CandidateFact]] = []
    for c in cands:
        if c.verdict.status == "rejected":
            continue
        key = (c.fact["benefit_code"], c.fact.get("network_scope") or "")
        prev = kept.get(key)
        if prev is None:
            kept[key] = c
        elif same_value(prev.fact, c.fact):
            # identical repeat, keep the higher-confidence witness
            if (c.fact.get("confidence") or 0) > (prev.fact.get("confidence") or 0):
                kept[key] = c
        else:
            conflicts.append((prev, c))
    return list(kept.values()), conflicts
