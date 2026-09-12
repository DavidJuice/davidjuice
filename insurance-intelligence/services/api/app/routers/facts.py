from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import audit, q, q1
from ..deps import Principal, current_principal, require_reviewer

router = APIRouter(prefix="/facts", tags=["facts"])


class VerifyRequest(BaseModel):
    action: str                       # approve | edit | reject
    value_numeric: float | None = None
    value_text: str | None = None
    frequency: str | None = None
    limits: str | None = None
    conditions: str | None = None
    reason: str | None = None


@router.get("/review-queue")
def review_queue(p: Principal = Depends(current_principal), plan_year: int | None = None):
    return q("""select f.*, bt.label_en, bt.label_ko, bt.sort_order,
                   s.document_id, s.page_number, s.source_text,
                   d.original_filename, pl.plan_name, pl.plan_id_ext
                from extracted_facts f
                join benefit_types bt on bt.code = f.benefit_code
                join fact_sources s on s.fact_id = f.id
                join documents d on d.id = s.document_id
                join plans pl on pl.id = f.plan_id
                where f.agency_id = %s
                  and f.verification_status in ('extracted','needs_review','conflict')
                  and (%s::int is null or f.plan_year = %s)
                order by f.verification_status desc, bt.sort_order""",
             (p.agency_id, plan_year, plan_year))


@router.post("/{fact_id}/verify")
def verify(fact_id: str, body: VerifyRequest, p: Principal = Depends(current_principal)):
    require_reviewer(p)
    fact = q1("select * from extracted_facts where id=%s and agency_id=%s", (fact_id, p.agency_id))
    if not fact:
        raise HTTPException(404, "not found")

    if body.action == "approve":
        q("""update extracted_facts set verification_status='verified',
              reviewed_by=%s, reviewed_at=now() where id=%s""", (p.user_id, fact_id))
        new_id = fact_id
    elif body.action == "reject":
        q("""update extracted_facts set verification_status='rejected', rejected_reason=%s,
              reviewed_by=%s, reviewed_at=now() where id=%s""",
          (body.reason or "reviewer rejected", p.user_id, fact_id))
        new_id = fact_id
    elif body.action == "edit":
        # The original extraction is NEVER mutated (spec §32). A corrected fact is a new
        # row; the original is superseded and stays in history with its evidence intact.
        row = q1("""insert into extracted_facts
            (agency_id,plan_id,plan_year,benefit_code,value_numeric,value_text,value_boolean,
             unit,frequency,is_conditional,conditions,limits,network_scope,
             extraction_confidence,verification_status,extracted_by_model,reviewed_by,reviewed_at)
            select agency_id,plan_id,plan_year,benefit_code,
                   coalesce(%s, value_numeric), coalesce(%s, value_text), value_boolean,
                   unit, coalesce(%s::benefit_frequency, frequency), is_conditional,
                   coalesce(%s, conditions), coalesce(%s, limits), network_scope,
                   extraction_confidence,'verified','human:reviewer',%s, now()
            from extracted_facts where id=%s returning id""",
            (body.value_numeric, body.value_text, body.frequency, body.conditions,
             body.limits, p.user_id, fact_id))
        new_id = str(row["id"])
        q("""insert into fact_sources (fact_id,source_kind,document_id,page_number,section,source_text,bbox)
             select %s, source_kind, document_id, page_number, section, source_text, bbox
             from fact_sources where fact_id=%s""", (new_id, fact_id))
        q("""update extracted_facts set superseded_by=%s, verification_status='rejected',
              rejected_reason='superseded by reviewer correction', reviewed_by=%s,
              reviewed_at=now() where id=%s""", (new_id, p.user_id, fact_id))
    else:
        raise HTTPException(400, "action must be approve|edit|reject")

    audit(p.agency_id, p.user_id, f"fact.{body.action}", "extracted_fact", fact_id,
          {"reason": body.reason, "result_fact_id": new_id})
    return q1("select * from extracted_facts where id=%s", (new_id,))


@router.get("/{fact_id}/provenance")
def provenance(fact_id: str, p: Principal = Depends(current_principal)):
    fact = q1("""select f.*, bt.label_en, bt.label_ko from extracted_facts f
                 join benefit_types bt on bt.code=f.benefit_code
                 where f.id=%s and f.agency_id=%s""", (fact_id, p.agency_id))
    if not fact:
        raise HTTPException(404, "not found")
    sources = q("""select s.*, d.original_filename, d.document_type
                   from fact_sources s left join documents d on d.id=s.document_id
                   where s.fact_id=%s""", (fact_id,))
    conflicts = q("""select * from fact_conflicts
                     where (fact_a=%s or fact_b=%s) and not resolved""", (fact_id, fact_id))
    return {"fact": fact, "sources": sources, "conflicts": conflicts}
