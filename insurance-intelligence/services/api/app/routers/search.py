from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import q
from ..deps import Principal, current_principal
from ..query.nl_to_filters import QueryPlan, interpret

router = APIRouter(prefix="/search", tags=["search"])


class PlanSearch(BaseModel):
    question: str | None = None
    plan_year: int | None = None
    state: str | None = None
    counties: list[str] | None = None
    filters: list[dict] | None = None
    strict: bool = True


def _sql(plan: QueryPlan, agency_id: str, strict: bool):
    """Each benefit filter becomes its own EXISTS over verified facts.

    Frequency is matched when the question stated one: a request for $100/month must not
    be satisfied by a $100/quarter benefit (spec §40 'wrong frequency').
    """
    params: dict = {"a": agency_id, "y": plan.plan_year}
    statuses = ["verified"] if strict else ["verified", "extracted", "needs_review"]
    params["st_list"] = statuses
    where = ["pl.plan_year = %(y)s"]
    if plan.counties:
        where.append("""exists (select 1 from plan_service_areas sa
                         where sa.plan_id = pl.id and sa.county = any(%(counties)s))""")
        params["counties"] = plan.counties
    if plan.state:
        where.append("""exists (select 1 from plan_service_areas sa2
                         where sa2.plan_id = pl.id and sa2.state = %(state)s)""")
        params["state"] = plan.state

    for i, f in enumerate(plan.filters):
        op = {"gte": ">=", "lte": "<=", "eq": "="}[f.op]
        params[f"code{i}"] = f.benefit_code
        params[f"val{i}"] = f.value
        freq_clause = ""
        if f.frequency:
            params[f"freq{i}"] = f.frequency
            freq_clause = f" and ef.frequency = %(freq{i})s::benefit_frequency"
        where.append(f"""exists (select 1 from extracted_facts ef
             where ef.plan_id = pl.id and ef.plan_year = pl.plan_year
               and ef.agency_id = %(a)s and ef.superseded_by is null
               and ef.verification_status = any(%(st_list)s)
               and ef.benefit_code = %(code{i})s
               and ef.value_numeric {op} %(val{i})s{freq_clause})""")

    order = "pl.plan_name"
    if plan.order_by_code:
        params["ob"] = plan.order_by_code
        order = f"""(select min(ef2.value_numeric) from extracted_facts ef2
                     where ef2.plan_id = pl.id and ef2.benefit_code = %(ob)s
                       and ef2.agency_id = %(a)s and ef2.superseded_by is null
                       and ef2.verification_status = any(%(st_list)s))
                    {'asc' if plan.order_dir == 'asc' else 'desc'} nulls last"""
    params["lim"] = plan.limit
    sql = f"""select pl.id, pl.plan_name, pl.plan_id_ext, pl.plan_year, pl.org_type, pl.snp,
                     c.short_name as carrier
              from plans pl join carriers c on c.id = pl.carrier_id
              where {' and '.join(where)}
                and exists (select 1 from documents d where d.plan_id = pl.id and d.agency_id = %(a)s)
              order by {order} limit %(lim)s"""
    return sql, params


@router.post("/plans")
def search_plans(body: PlanSearch, p: Principal = Depends(current_principal)):
    if body.question:
        plan = interpret(body.question, default_year=body.plan_year)
    else:
        plan = QueryPlan(plan_year=body.plan_year, state=body.state,
                         counties=body.counties or [])
        from ..query.nl_to_filters import Filter
        for f in body.filters or []:
            plan.filters.append(Filter(f["benefit_code"], f["op"], float(f["value"]),
                                       f.get("frequency")))
    if plan.plan_year is None:
        raise HTTPException(422, "plan_year is required: a plan year is never inferred")
    if plan.counties and not body.state and not plan.state:
        plan.state = body.state
    sql, params = _sql(plan, p.agency_id, body.strict)
    rows = q(sql, params)

    # Every returned benefit value carries its own provenance handle.
    codes = sorted({f.benefit_code for f in plan.filters} | set(plan.select_codes) |
                   ({plan.order_by_code} if plan.order_by_code else set()))
    values = {}
    if rows and codes:
        for r in q("""select f.plan_id, f.id as fact_id, f.benefit_code, f.value_numeric,
                        f.frequency, f.verification_status, s.document_id, s.page_number
                      from extracted_facts f
                      left join fact_sources s on s.fact_id = f.id
                      where f.plan_id = any(%s) and f.benefit_code = any(%s)
                        and f.agency_id = %s and f.superseded_by is null""",
                   ([r["id"] for r in rows], codes, p.agency_id)):
            values.setdefault(str(r["plan_id"]), []).append(r)
    for r in rows:
        r["matched_values"] = values.get(str(r["id"]), [])
    return {"query_plan": {"plan_year": plan.plan_year, "counties": plan.counties,
                           "filters": [f.__dict__ for f in plan.filters],
                           "order_by": plan.order_by_code, "language": plan.language},
            "results": rows}
