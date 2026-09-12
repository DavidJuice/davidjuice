from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..db import q, q1
from ..deps import Principal, current_principal

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("")
def list_plans(plan_year: int, state: str | None = None, county: str | None = None,
               p: Principal = Depends(current_principal)):
    """plan_year is REQUIRED, not defaulted. A missing year is a 422, never 'latest'."""
    return q("""select distinct pl.id, pl.plan_name, pl.plan_id_ext, pl.plan_year,
                   pl.org_type, pl.snp, c.short_name as carrier
                from plans pl
                join carriers c on c.id = pl.carrier_id
                left join plan_service_areas sa on sa.plan_id = pl.id
                where pl.plan_year = %(y)s
                  and (%(st)s::text is null or sa.state = %(st)s)
                  and (%(co)s::text is null or sa.county = %(co)s)
                  and exists (select 1 from documents d
                              where d.plan_id = pl.id and d.agency_id = %(a)s)
                order by pl.plan_name""",
             {"y": plan_year, "st": state, "co": county, "a": p.agency_id})


@router.get("/{plan_id}")
def plan_detail(plan_id: str, strict: bool = True,
                p: Principal = Depends(current_principal)):
    plan = q1("""select pl.*, c.short_name as carrier from plans pl
                 join carriers c on c.id = pl.carrier_id where pl.id = %s""", (plan_id,))
    if not plan:
        raise HTTPException(404, "not found")
    statuses = ("verified",) if strict else ("verified", "extracted", "needs_review", "conflict")
    benefits = q("""select f.id, f.benefit_code, f.value_numeric, f.value_text, f.unit,
                       f.frequency, f.is_conditional, f.conditions, f.limits,
                       f.network_scope, f.verification_status,
                       bt.label_en, bt.label_ko, bt.category, bt.sort_order,
                       s.document_id, s.page_number, s.section, s.source_text
                    from extracted_facts f
                    join benefit_types bt on bt.code = f.benefit_code
                    left join fact_sources s on s.fact_id = f.id
                    where f.plan_id = %s and f.agency_id = %s and f.superseded_by is null
                      and f.verification_status = any(%s)
                    order by bt.sort_order""",
                 (plan_id, p.agency_id, list(statuses)))
    areas = q("select state, county from plan_service_areas where plan_id=%s", (plan_id,))
    docs = q("""select id, original_filename, document_type, page_count
                from documents where plan_id=%s and agency_id=%s""", (plan_id, p.agency_id))
    return {"plan": plan, "service_areas": areas, "benefits": benefits, "documents": docs,
            "strict_evidence_mode": strict}
