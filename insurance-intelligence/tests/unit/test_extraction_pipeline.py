"""End-to-end extraction over a realistic SOB page, using the deterministic provider."""
from app.ingest.extract import dedupe_and_flag_conflicts, extract_page
from app.llm.mock import MockProvider
from conftest import fixture_page


def run(name="sample_sob_page.txt", plan_year=2026, doc_year=2026):
    return extract_page(MockProvider(), fixture_page(name),
                        plan_year=plan_year, document_plan_year=doc_year)


def by_code(cands):
    return {c.fact["benefit_code"]: c for c in cands if c.verdict.ok}


def test_extracts_the_core_mvp_fields():
    got = by_code(run())
    assert got["monthly_premium"].fact["value_numeric"] == 0.0
    assert got["moop_in_network"].fact["value_numeric"] == 5900.0
    assert got["specialist_copay"].fact["value_numeric"] == 35.0
    assert got["dental_comprehensive_max"].fact["value_numeric"] == 2500.0
    assert got["hearing_aid_allowance"].fact["value_numeric"] == 1500.0
    assert got["rx_tier1_preferred_30"].fact["value_numeric"] == 0.0
    assert got["part_b_giveback"].fact["value_numeric"] == 50.0


def test_every_kept_fact_carries_page_and_verbatim_evidence():
    for c in run():
        if c.verdict.ok:
            assert c.page_number == 1
            assert c.fact["source_text"].strip()
            assert c.bbox is not None          # geometry retained for column checks


def test_frequency_is_read_from_the_page_not_defaulted():
    got = by_code(run())
    assert got["monthly_premium"].fact["frequency"] == "per_month"
    assert got["moop_in_network"].fact["frequency"] == "per_year"
    assert got["specialist_copay"].fact["frequency"] == "per_visit"


def test_absent_benefit_is_not_reported_as_zero():
    got = by_code(run())
    # the fixture never mentions transportation, OTC or fitness
    assert "transportation_trips" not in got
    assert "otc_allowance" not in got
    assert "fitness_benefit" not in got


def test_wrong_year_document_yields_no_usable_facts():
    cands = run(plan_year=2027, doc_year=2026)
    assert cands, "the provider should still emit candidates"
    assert all(c.verdict.status == "rejected" for c in cands)


def test_conflicting_values_are_surfaced_not_resolved():
    cands = run() + run("sample_sob_page_conflict.txt")
    kept, conflicts = dedupe_and_flag_conflicts(cands)
    codes = {c.fact["benefit_code"] for c, _ in conflicts}
    assert "specialist_copay" in codes            # $35 vs $45
    # dental repeats identically across both pages and must NOT be a conflict
    assert "dental_comprehensive_max" not in codes
    assert len([k for k in kept if k.fact["benefit_code"] == "dental_comprehensive_max"]) == 1
