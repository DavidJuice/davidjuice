"""Spec §9 Strict Evidence Mode + §16/17 retrieval scoping."""
import pytest

from app.llm.mock import MockProvider
from app.retrieval.hybrid import YearScopeError, _prefilter, _rrf

REFUSAL = "Unable to verify from the available carrier documents."


def test_retrieval_without_a_plan_year_is_an_error_not_a_default():
    with pytest.raises(YearScopeError):
        _prefilter("agency-1", None, None, None, None)


def test_prefilter_pins_agency_year_and_plan_in_sql():
    where, params = _prefilter("agency-1", 2026, ["plan-a"], None, ["SOB"])
    assert "c.plan_year = %(year)s" in where
    assert "c.agency_id = %(agency)s" in where
    assert "c.plan_id = any(%(plans)s)" in where
    assert "document_versions" in where          # archived versions excluded
    assert params["year"] == 2026 and params["plans"] == ["plan-a"]


def test_summarizer_refuses_when_passages_do_not_support_the_question():
    out = MockProvider().summarize_evidence(
        "Does this plan include pest control?",
        [{"text": "Comprehensive Dental: $2,500 allowance per year.", "page_number": 4}]).data
    assert out["refused"] and out["answer"] == REFUSAL
    assert out["citation_indices"] == []


def test_summarizer_answers_only_from_a_supporting_passage():
    out = MockProvider().summarize_evidence(
        "Does the dental allowance include implants?",
        [{"text": "Unrelated transportation text.", "page_number": 2},
         {"text": "The comprehensive dental allowance includes implants and dentures.",
          "page_number": 9}]).data
    assert not out["refused"]
    assert out["citation_indices"] == [1]
    assert "implants" in out["answer"]


def test_rrf_prefers_documents_ranked_by_both_engines():
    fts = [{"id": "a"}, {"id": "b"}, {"id": "c"}]
    vec = [{"id": "c"}, {"id": "a"}, {"id": "z"}]
    for r in fts + vec:
        r.update({"document_id": "d", "page_number": 1, "section": None, "text": "t"})
    out = _rrf(fts, vec, 3)
    assert out[0].chunk_id == "a"                 # rank1+rank2 beats rank3+rank1
    assert {p.chunk_id for p in out} == {"a", "c", "b"}


def test_embeddings_are_deterministic_and_correctly_dimensioned():
    m = MockProvider()
    assert m.embed(["dental"])[0] == m.embed(["dental"])[0]
    assert len(m.embed(["dental"])[0]) == 1536
