from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..db import audit, q, q1
from ..deps import Principal, current_principal
from ..llm.registry import get_provider
from ..ontology.fields import resolve_field
from ..retrieval.hybrid import YearScopeError, search

router = APIRouter(tags=["ask"])

REFUSAL = "Unable to verify from the available carrier documents."


class AskRequest(BaseModel):
    question: str
    plan_id: str
    plan_year: int
    strict: bool | None = None
    language: str | None = None


@router.post("/ask")
def ask(body: AskRequest, p: Principal = Depends(current_principal)):
    """Module D - Ask This Plan.

    Structured fields answer from verified facts. Everything else answers only from
    retrieved passages of THIS plan and THIS plan year, or refuses.
    """
    strict = settings().strict_evidence_default if body.strict is None else body.strict
    plan = q1("select * from plans where id=%s and plan_year=%s", (body.plan_id, body.plan_year))
    if not plan:
        raise HTTPException(404, "no such plan for that plan year")

    qrow = q1("""insert into questions (agency_id,user_id,raw_text,language,plan_year)
                 values (%s,%s,%s,%s,%s) returning id""",
              (p.agency_id, p.user_id, body.question,
               body.language or ("ko" if any("가" <= c <= "힣" for c in body.question) else "en"),
               body.plan_year))

    # 1. deterministic path: a known field with a verified value
    code = resolve_field(body.question)
    if code:
        fact = q1("""select f.*, bt.label_en, bt.label_ko, s.document_id, s.page_number,
                        s.section, s.source_text, d.original_filename
                     from extracted_facts f
                     join benefit_types bt on bt.code=f.benefit_code
                     left join fact_sources s on s.fact_id=f.id
                     left join documents d on d.id=s.document_id
                     where f.plan_id=%s and f.plan_year=%s and f.benefit_code=%s
                       and f.agency_id=%s and f.superseded_by is null
                       and f.verification_status = any(%s)""",
                  (body.plan_id, body.plan_year, code, p.agency_id,
                   ["verified"] if strict else ["verified", "extracted", "needs_review"]))
        if fact:
            return _respond(p, qrow["id"], _render_fact(fact, body.language), False,
                            [{"document_id": str(fact["document_id"]), "fact_id": str(fact["id"]),
                              "page_number": fact["page_number"], "section": fact["section"],
                              "quoted_text": fact["source_text"]}],
                            route="structured", provider="deterministic", model="sql")

    # 2. evidence path
    try:
        passages = search(body.question, agency_id=p.agency_id, plan_year=body.plan_year,
                          plan_ids=[body.plan_id], k=8)
    except YearScopeError as exc:
        raise HTTPException(422, str(exc)) from exc
    if not passages:
        return _respond(p, qrow["id"], REFUSAL, True, [], route="evidence",
                        provider="none", model="none")

    provider = get_provider(settings().llm_provider)
    res = provider.summarize_evidence(
        body.question,
        [{"text": ps.text, "document_id": ps.document_id, "page_number": ps.page_number}
         for ps in passages])
    data = res.data
    cites = [passages[i] for i in data.get("citation_indices", []) if 0 <= i < len(passages)]

    # Strict Evidence Mode: an answer with no citation is not an answer.
    if strict and not data.get("refused") and not cites:
        return _respond(p, qrow["id"], REFUSAL, True, [], route="evidence",
                        provider=res.provider, model=res.model, latency=res.latency_ms)

    return _respond(p, qrow["id"],
                    REFUSAL if data.get("refused") else data.get("answer", REFUSAL),
                    bool(data.get("refused")),
                    [{"document_id": c.document_id, "fact_id": None,
                      "page_number": c.page_number, "section": c.section,
                      "quoted_text": c.text} for c in cites],
                    route="evidence", provider=res.provider, model=res.model,
                    latency=res.latency_ms)


def _render_fact(f: dict, language: str | None) -> str:
    label = f["label_ko"] if language == "ko" else f["label_en"]
    if f["value_numeric"] is not None:
        unit = f["unit"] or ""
        val = f"${f['value_numeric']:,.0f}" if unit == "USD" else f"{f['value_numeric']:g}"
    else:
        val = f["value_text"] or str(f["value_boolean"])
    freq = "" if f["frequency"] == "not_applicable" else f" ({f['frequency'].replace('_', ' ')})"
    cond = f"  Conditional: {f['conditions']}" if f["is_conditional"] else ""
    lim = f"  Limits: {f['limits']}" if f["limits"] else ""
    return f"{label}: {val}{freq}{lim}{cond}"


def _respond(p, question_id, answer, refused, citations, *, route, provider, model,
             latency: int | None = None):
    q("update questions set route=%s where id=%s", (route, question_id))
    arow = q1("""insert into answers (question_id,answer_text,refused,provider,model,latency_ms)
                 values (%s,%s,%s,%s,%s,%s) returning id""",
              (question_id, answer, refused, provider, model, latency))
    for c in citations:
        q("""insert into citations (answer_id,document_id,fact_id,page_number,section,quoted_text)
             values (%s,%s,%s,%s,%s,%s)""",
          (arow["id"], c["document_id"], c.get("fact_id"), c["page_number"],
           c.get("section"), c["quoted_text"]))
    audit(p.agency_id, p.user_id, "answer.generate", "answer", str(arow["id"]),
          {"route": route, "provider": provider, "model": model, "refused": refused})
    return {"answer": answer, "refused": refused, "route": route,
            "citations": citations, "provider": provider, "model": model}
