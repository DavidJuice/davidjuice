"""Hybrid retrieval: metadata prefilter -> (FTS + vector) -> RRF fuse (spec §16/§17).

The prefilter is a SQL WHERE clause applied INSIDE both the FTS and the vector query.
Filtering after retrieval is the wrong-year/wrong-plan bug waiting to happen: a vector
index has no notion of a plan year, and top-k from the wrong plan crowds out the right one.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..db import q
from ..llm.registry import get_embedder

RRF_K = 60


class YearScopeError(ValueError):
    """Raised when a retrieval is attempted without an explicit plan year."""


@dataclass
class Passage:
    chunk_id: str
    document_id: str
    page_number: int
    section: str | None
    text: str
    score: float


def _prefilter(agency_id: str, plan_year: int | None, plan_ids: list[str] | None,
               document_ids: list[str] | None, doc_types: list[str] | None):
    if plan_year is None:
        raise YearScopeError("plan_year is required for document retrieval")
    where = ["c.agency_id = %(agency)s", "c.plan_year = %(year)s",
             # archived document versions are never retrievable
             """exists (select 1 from document_versions v
                        where v.document_id = c.document_id and v.is_active)"""]
    params: dict = {"agency": agency_id, "year": plan_year}
    if plan_ids:
        where.append("c.plan_id = any(%(plans)s)")
        params["plans"] = plan_ids
    if document_ids:
        where.append("c.document_id = any(%(docs)s)")
        params["docs"] = document_ids
    if doc_types:
        where.append("c.document_type::text = any(%(dtypes)s)")
        params["dtypes"] = doc_types
    return " and ".join(where), params


def search(question: str, *, agency_id: str, plan_year: int,
           plan_ids: list[str] | None = None, document_ids: list[str] | None = None,
           doc_types: list[str] | None = None, k: int = 8) -> list[Passage]:
    where, params = _prefilter(agency_id, plan_year, plan_ids, document_ids, doc_types)
    params["q"] = question
    params["k"] = k * 4

    fts = q(f"""
        select c.id, c.document_id, c.page_number, c.section, c.text,
               ts_rank_cd(c.tsv, plainto_tsquery('english', %(q)s)) as s
        from document_chunks c
        where {where} and c.tsv @@ plainto_tsquery('english', %(q)s)
        order by s desc limit %(k)s""", params)

    vec = []
    embedding = get_embedder().embed([question])[0]
    params["emb"] = str(embedding)
    vec = q(f"""
        select c.id, c.document_id, c.page_number, c.section, c.text,
               1 - (c.embedding <=> %(emb)s::vector) as s
        from document_chunks c
        where {where} and c.embedding is not null
        order by c.embedding <=> %(emb)s::vector limit %(k)s""", params)

    return _rrf(fts, vec, k)


def _rrf(*lists, k: int = 8) -> list[Passage]:
    """Reciprocal rank fusion. Rank-based, so FTS scores and cosine distances never have
    to be put on a common scale."""
    ranked = lists[:-1] if isinstance(lists[-1], int) else lists
    k = lists[-1] if isinstance(lists[-1], int) else k
    scores: dict[str, float] = {}
    rows: dict[str, dict] = {}
    for lst in ranked:
        for rank, row in enumerate(lst):
            rid = str(row["id"])
            scores[rid] = scores.get(rid, 0.0) + 1.0 / (RRF_K + rank + 1)
            rows[rid] = row
    top = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:k]
    return [Passage(rid, str(rows[rid]["document_id"]), rows[rid]["page_number"],
                    rows[rid]["section"], rows[rid]["text"], score)
            for rid, score in top]
