"""Spec §21 validation rules and §40 failure modes."""
import pytest

from app.ingest.validate import Verdict, annualized, same_value, validate_fact
from conftest import fixture_page

PAGE = fixture_page("sample_sob_page.txt")


def base(**over):
    f = {"benefit_code": "specialist_copay", "value_numeric": 35.0, "unit": "USD",
         "frequency": "per_visit", "source_text": "Specialist visit: $35 copay per visit",
         "is_conditional": False}
    f.update(over)
    return f


def v(fact, plan_year=2026, doc_year=2026):
    return validate_fact(fact, plan_year=plan_year, document_plan_year=doc_year,
                         page_text=PAGE.text)


def test_clean_fact_passes():
    assert v(base()).status == "extracted"


def test_source_text_must_exist_on_the_page():
    r = v(base(source_text="Specialist visit: $35 copay, dentures included"))
    assert r.status == "rejected" and "not found on cited page" in r.reasons[0]


def test_value_must_appear_in_its_own_evidence():
    # the classic fabrication: right sentence, wrong number
    r = v(base(value_numeric=25.0))
    assert r.status == "rejected"


def test_whitespace_differences_do_not_reject():
    assert v(base(source_text="Specialist   visit:  $35 copay per visit")).status == "extracted"


def test_missing_frequency_is_rejected_not_defaulted():
    r = v(base(frequency="not_applicable"))
    assert r.status == "rejected" and "explicit frequency" in r.reasons[0]


def test_frequency_outside_the_allowed_set_is_rejected():
    r = v(base(frequency="per_quarter"))
    assert r.status == "rejected" and "not allowed" in " ".join(r.reasons)


def test_wrong_plan_year_document_is_rejected():
    r = v(base(), plan_year=2027, doc_year=2026)
    assert r.status == "rejected" and "plan_year" in " ".join(r.reasons)


def test_negative_value_rejected():
    assert v(base(value_numeric=-35.0,
                  source_text="Specialist visit: $35 copay per visit")).status == "rejected"


def test_implausible_value_goes_to_review_not_silently_through():
    f = base(benefit_code="moop_in_network", value_numeric=5900.0, frequency="per_year",
             source_text="Maximum out-of-pocket responsibility: $5,900 per year (in-network)")
    assert v(f).status == "extracted"
    big = base(benefit_code="moop_in_network", value_numeric=90000.0, frequency="per_year",
               source_text="Maximum out-of-pocket responsibility: $90000 per year")
    r = validate_fact(big, plan_year=2026, document_plan_year=2026,
                      page_text=big["source_text"])
    assert r.status == "needs_review"


def test_conditional_benefit_without_conditions_goes_to_review():
    r = v(base(is_conditional=True))
    assert r.status == "needs_review"


def test_unknown_benefit_code_rejected():
    assert v(base(benefit_code="dental_implants_lol")).status == "rejected"


def test_zero_is_a_real_value():
    f = base(benefit_code="pcp_copay", value_numeric=0.0,
             source_text="Primary care physician visit: $0 copay per visit")
    assert v(f).status == "extracted"


# --- §40 frequency confusion -------------------------------------------------

def test_quarterly_and_monthly_are_never_equal():
    a = {"value_numeric": 100.0, "frequency": "per_quarter", "network_scope": "in_network"}
    b = {"value_numeric": 100.0, "frequency": "per_month", "network_scope": "in_network"}
    assert not same_value(a, b)


def test_annualize_refuses_non_period_frequencies():
    assert annualized(100.0, "per_quarter") == 400.0
    assert annualized(35.0, "per_visit") is None      # a copay has no annual equivalent
    assert annualized(500.0, "per_day") is None
