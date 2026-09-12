from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import q
from ..deps import Principal, current_principal
from ..ingest.validate import same_value

router = APIRouter(tags=["compare"])


class CompareRequest(BaseModel):
    plan_ids: list[str]
    plan_year: int
    strict: bool = True


class CompareYearsRequest(BaseModel):
    contract_id: str
    pbp: str
    years: list[int]
    strict: bool = True


def _matrix(plan_ids: list[str], plan_year: int, agency_id: str, strict: bool):
    statuses = ["verified"] if strict else ["verified", "extracted", "needs_review"]
    rows = q("""select f.plan_id, f.id as fact_id, f.benefit_code, f.value_numeric,
                   f.value_text, f.value_boolean, f.unit, f.frequency, f.limits,
                   f.conditions, f.is_conditional, f.verification_status,
                   bt.label_en, bt.label_ko, bt.category, bt.sort_order,
                   s.document_id, s.page_number, s.source_text
                from extracted_facts f
                join benefit_types bt on bt.code = f.benefit_code
                left join fact_sources s on s.fact_id = f.id
                where f.plan_id = any(%s) and f.plan_year = %s and f.agency_id = %s
                  and f.superseded_by is null and f.verification_status = any(%s)
                order by bt.sort_order""",
             (plan_ids, plan_year, agency_id, statuses))
    cells: dict[str, dict[str, dict]] = {}
    meta: dict[str, dict] = {}
    for r in rows:
        meta.setdefault(r["benefit_code"], {"label_en": r["label_en"], "label_ko": r["label_ko"],
                                            "category": r["category"], "sort_order": r["sort_order"]})
        cells.setdefault(r["benefit_code"], {})[str(r["plan_id"])] = r
    return cells, meta


@router.post("/compare")
def compare(body: CompareRequest, p: Principal = Depends(current_principal)):
    """Module C. Missing is rendered as 'Missing', never as $0 and never inferred."""
    if not 2 <= len(body.plan_ids) <= 6:
        raise HTTPException(422, "compare 2-6 plans")
    plans = q("""select pl.id, pl.plan_name, pl.plan_id_ext, pl.plan_year, c.short_name carrier
                 from plans pl join carriers c on c.id=pl.carrier_id
                 where pl.id = any(%s) and pl.plan_year = %s""", (body.plan_ids, body.plan_year))
    if len(plans) != len(body.plan_ids):
        raise HTTPException(422, "one or more plans do not exist in that plan year")
    cells, meta = _matrix(body.plan_ids, body.plan_year, p.agency_id, body.strict)
    out = []
    for code, m in sorted(meta.items(), key=lambda kv: kv[1]["sort_order"]):
        out.append({"benefit_code": code, **m,
                    "values": {pid: cells[code].get(pid) or {"status": "missing"}
                               for pid in body.plan_ids}})
    return {"plans": plans, "plan_year": body.plan_year, "rows": out,
            "strict_evidence_mode": body.strict}


@router.post("/compare-years")
def compare_years(body: CompareYearsRequest, p: Principal = Depends(current_principal)):
    """Module E. Both years are requested EXPLICITLY; nothing crosses years implicitly."""
    if len(body.years) != 2:
        raise HTTPException(422, "compare exactly two plan years")
    y1, y2 = sorted(body.years)
    plans = {r["plan_year"]: r for r in q(
        """select pl.id, pl.plan_name, pl.plan_year from plans pl
           where pl.contract_id=%s and pl.pbp=%s and pl.plan_year = any(%s)""",
        (body.contract_id, body.pbp, [y1, y2]))}
    missing = [y for y in (y1, y2) if y not in plans]
    if missing:
        raise HTTPException(404, f"no plan rows for {body.contract_id}-{body.pbp} in {missing}")

    a, _ = _matrix([str(plans[y1]["id"])], y1, p.agency_id, body.strict)
    b, meta = _matrix([str(plans[y2]["id"])], y2, p.agency_id, body.strict)
    _, meta_a = _matrix([str(plans[y1]["id"])], y1, p.agency_id, body.strict)
    meta = {**meta_a, **meta}

    rows = []
    for code, m in sorted(meta.items(), key=lambda kv: kv[1]["sort_order"]):
        fa = next(iter(a.get(code, {}).values()), None)
        fb = next(iter(b.get(code, {}).values()), None)
        delta = None
        if fa and fb:
            if fa["frequency"] != fb["frequency"]:
                # A frequency change is a benefit change, not a numeric delta.
                delta = {"kind": "frequency_change",
                         "from": fa["frequency"], "to": fb["frequency"]}
            elif fa["value_numeric"] is not None and fb["value_numeric"] is not None:
                diff = float(fb["value_numeric"]) - float(fa["value_numeric"])
                delta = {"kind": "numeric", "change": diff}
            elif not same_value(fa, fb):
                delta = {"kind": "text_change"}
        elif fa or fb:
            delta = {"kind": "added" if fb else "removed"}
        rows.append({"benefit_code": code, **m, str(y1): fa, str(y2): fb, "delta": delta})
    return {"contract_id": body.contract_id, "pbp": body.pbp, "years": [y1, y2],
            "rows": rows, "strict_evidence_mode": body.strict}
