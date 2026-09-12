"""Natural language -> deterministic filters (spec §Module B).

Order of operations matters: a deterministic pass runs FIRST and the LLM only fills
what regex/vocabulary could not resolve. The LLM's output is then re-validated against
the ontology, so it can never introduce a field, a year, or a value we did not verify.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field as dfield

from ..ontology.fields import BY_CODE, resolve_field

_NUM = r"\$?\s?([0-9][0-9,]*(?:\.\d+)?)"
_GTE = re.compile(rf"(?:at least|over|above|more than|>=|greater than|이상)\s*{_NUM}|"
                  rf"{_NUM}\s*(?:or more|이상)", re.I)
_LTE = re.compile(rf"(?:under|below|less than|at most|<=|no more than|이하)\s*{_NUM}|"
                  rf"{_NUM}\s*(?:or less|이하)", re.I)
# "$0 premium" / "premium is $0" state an exact threshold with no comparator word.
_ZERO = re.compile(r"\$\s?0(?![.\d])")
_YEAR = re.compile(r"\b(20[2-9]\d)\b")
_COUNTY = re.compile(r"\b(Snohomish|King|Pierce|Spokane|Clark|Thurston|Kitsap|Whatcom)\b", re.I)
# A projection verb ("compare X across ...", "list X for ...") is a structured request
# even with no threshold: the agent wants a column of values, not a prose answer.
_PROJECT = re.compile(r"\b(compare|across|list|show me)\b|비교", re.I)
_LOWEST = re.compile(r"\b(lowest|cheapest|최저|가장 낮은)\b", re.I)
_HIGHEST = re.compile(r"\b(highest|largest|most|최고|가장 높은)\b", re.I)
_FREQ = [(re.compile(r"per month|monthly|a month|매달|매월", re.I), "per_month"),
         (re.compile(r"per quarter|quarterly|분기", re.I), "per_quarter"),
         (re.compile(r"per year|annual|a year|연간", re.I), "per_year")]


@dataclass
class Filter:
    benefit_code: str
    op: str          # gte | lte | eq
    value: float
    frequency: str | None = None


@dataclass
class QueryPlan:
    route: str = "structured"
    plan_year: int | None = None
    plan_years: list[int] = dfield(default_factory=list)
    state: str | None = None
    counties: list[str] = dfield(default_factory=list)
    filters: list[Filter] = dfield(default_factory=list)
    select_codes: list[str] = dfield(default_factory=list)
    order_by_code: str | None = None
    order_dir: str = "asc"
    limit: int = 50
    language: str = "en"
    unresolved: bool = False


def _num(m: re.Match) -> float:
    raw = next(g for g in m.groups() if g)
    return float(raw.replace(",", "").replace("$", "").strip())


def _freq(text: str) -> str | None:
    for pat, f in _FREQ:
        if pat.search(text):
            return f
    return None


def _clauses(question: str) -> list[str]:
    """Split on connectors so 'dental >= 2000 and OTC >= 100' yields two filters, each
    bound to its own field. Without this the second threshold attaches to the first
    field - a silent wrong-answer bug.

    The comma is only a separator when it is NOT a thousands separator: splitting
    "$2,000" into "$2" and "000" drops the filter entirely.
    """
    return [c for c in re.split(r"\band\b|\bwith\b|,(?!\d)|그리고|이면서|이고|이며", question, flags=re.I)
            if c.strip()]


def interpret(question: str, *, default_year: int | None = None,
              provider=None) -> QueryPlan:
    p = QueryPlan(language="ko" if re.search(r"[가-힣]", question) else "en")

    years = sorted({int(y) for y in _YEAR.findall(question)})
    if len(years) >= 2:
        p.route, p.plan_years = "compare_years", years
        p.plan_year = years[-1]
    elif years:
        p.plan_year = years[0]
    else:
        # NEVER guessed by a model. Either the caller supplies the active year context
        # or the request is rejected upstream (spec §11).
        p.plan_year = default_year

    if _COUNTY.search(question):
        p.counties = sorted({m.group(1).title() for m in _COUNTY.finditer(question)})
        p.state = "WA"

    for clause in _clauses(question):
        code = resolve_field(clause)
        if not code:
            continue
        freq = _freq(clause)
        matched = False
        for pat, op in ((_GTE, "gte"), (_LTE, "lte")):
            m = pat.search(clause)
            if m:
                p.filters.append(Filter(code, op, _num(m), freq))
                matched = True
                break
        if not matched and _ZERO.search(clause):
            p.filters.append(Filter(code, "eq", 0.0, freq))

    ordering_code = resolve_field(question)
    if ordering_code and (_LOWEST.search(question) or _HIGHEST.search(question)):
        p.order_by_code = ordering_code
        p.order_dir = "asc" if _LOWEST.search(question) else "desc"
        p.limit = 10
    elif ordering_code and _PROJECT.search(question) and p.route == "structured":
        p.select_codes.append(ordering_code)
        p.order_by_code = ordering_code

    if not p.filters and not p.order_by_code and p.route == "structured":
        # No structured handle found. Fall back to the LLM interpreter, then re-validate.
        if provider is not None:
            data = provider.interpret_query(question, _vocab()).data
            p = _merge_llm(p, data)
        if not p.filters and not p.order_by_code:
            # A question we cannot express as filters is an evidence question, not a
            # structured query with zero filters - which would match every plan.
            p.route = "evidence"
            p.unresolved = True
    return p


def _vocab() -> list[dict]:
    return [{"code": f.code, "label_en": f.label_en, "label_ko": f.label_ko,
             "allowed_frequencies": list(f.allowed_frequencies)} for f in BY_CODE.values()]


def _merge_llm(p: QueryPlan, data: dict) -> QueryPlan:
    """Accept only what the ontology recognizes. An unknown code is dropped, not
    passed through; a model-invented plan year is ignored entirely."""
    for f in data.get("filters") or []:
        code = f.get("benefit_code")
        bt = BY_CODE.get(code)
        if bt is None or f.get("op") not in ("gte", "lte", "eq"):
            continue
        try:
            value = float(f["value"])
        except (KeyError, TypeError, ValueError):
            continue
        freq = f.get("frequency")
        if freq and freq not in bt.allowed_frequencies:
            freq = None
        p.filters.append(Filter(code, f["op"], value, freq))
    ob = data.get("order_by") or {}
    if ob.get("benefit_code") in BY_CODE:
        p.order_by_code = ob["benefit_code"]
        p.order_dir = "desc" if ob.get("direction") == "desc" else "asc"
    if data.get("route") in ("structured", "evidence", "compare", "compare_years"):
        p.route = data["route"]
    return p
