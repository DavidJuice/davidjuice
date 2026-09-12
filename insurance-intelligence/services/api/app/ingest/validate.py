"""Deterministic validation (spec §21). Runs BEFORE anything reaches a human reviewer
and before any fact can be marked verified.

Every rule returns a reason string on failure. No rule consults an LLM.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..ontology.fields import BY_CODE, MONETARY_PERIODS


@dataclass
class Verdict:
    ok: bool
    status: str          # extracted | needs_review | rejected
    reasons: list[str]


def validate_fact(fact: dict, *, plan_year: int, document_plan_year: int | None,
                  page_text: str) -> Verdict:
    reasons: list[str] = []
    hard_fail = False

    code = fact.get("benefit_code")
    bt = BY_CODE.get(code)
    if bt is None:
        return Verdict(False, "rejected", [f"unknown benefit_code {code!r}"])

    # --- anchor: the quoted evidence must literally exist on the cited page ---
    from .pdf import normalize
    src = fact.get("source_text") or ""
    if not src.strip():
        return Verdict(False, "rejected", ["no source_text"])
    if normalize(src) not in normalize(page_text):
        return Verdict(False, "rejected", ["source_text not found on cited page"])

    # --- the value must appear in its own evidence ---
    if fact.get("value_numeric") is not None:
        v = fact["value_numeric"]
        digits = f"{v:,.2f}".rstrip("0").rstrip(".")
        plain = f"{int(v)}" if float(v).is_integer() else f"{v}"
        if digits not in src and plain not in src and f"{v}" not in src:
            hard_fail = True
            reasons.append("numeric value does not appear in its own source_text")

    # --- frequency ---
    freq = fact.get("frequency") or "not_applicable"
    if bt.frequency_required and freq == "not_applicable":
        hard_fail = True
        reasons.append(f"{code} requires an explicit frequency")
    if freq not in bt.allowed_frequencies:
        hard_fail = True
        reasons.append(f"frequency {freq!r} not allowed for {code} "
                       f"(allowed: {', '.join(bt.allowed_frequencies)})")

    # --- plan year isolation ---
    if document_plan_year is not None and document_plan_year != plan_year:
        hard_fail = True
        reasons.append(f"document plan_year {document_plan_year} != target {plan_year}")

    # --- sign and plausibility ---
    if fact.get("value_numeric") is not None:
        v = fact["value_numeric"]
        if v < 0:
            hard_fail = True
            reasons.append("negative value")
        if bt.max_plausible is not None and v > bt.max_plausible:
            reasons.append(f"value {v} exceeds plausible max {bt.max_plausible} for {code}")

    # --- conditional benefits must carry their condition text (SSBCI) ---
    if fact.get("is_conditional") and not (fact.get("conditions") or "").strip():
        reasons.append("marked conditional but no condition text captured")

    if hard_fail:
        return Verdict(False, "rejected", reasons)
    if reasons:
        return Verdict(True, "needs_review", reasons)
    return Verdict(True, "extracted", reasons)


def same_value(a: dict, b: dict) -> bool:
    """Equality used for conflict detection. Frequency is part of identity: $100/quarter
    and $100/month are different facts, never equal (spec §21, §40)."""
    if (a.get("frequency") or "not_applicable") != (b.get("frequency") or "not_applicable"):
        return False
    if (a.get("network_scope") or "") != (b.get("network_scope") or ""):
        return False
    for k in ("value_numeric", "value_boolean"):
        if a.get(k) != b.get(k):
            return False
    return (a.get("value_text") or "").strip().lower() == (b.get("value_text") or "").strip().lower()


def annualized(value: float, frequency: str) -> float | None:
    """Only defined for the three true monetary periods. Returns None otherwise, so a
    caller can never silently annualize a per_visit copay."""
    mult = MONETARY_PERIODS.get(frequency)
    return None if mult is None else value * mult
