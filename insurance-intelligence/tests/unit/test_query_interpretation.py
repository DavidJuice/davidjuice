"""Spec Module B + §Module F. The interpreter must never invent a field or a year."""
import pytest

from app.ontology.fields import BY_CODE, resolve_field
from app.query.nl_to_filters import interpret


def codes(p):
    return [(f.benefit_code, f.op, f.value, f.frequency) for f in p.filters]


def test_flagship_query_from_the_spec():
    p = interpret("Which 2027 Medicare Advantage plans in Snohomish County have at least "
                  "$2,000 in dental benefits and at least $100 per month in OTC benefits?")
    assert p.plan_year == 2027
    assert p.counties == ["Snohomish"] and p.state == "WA"
    assert ("dental_comprehensive_max", "gte", 2000.0, None) in codes(p)
    assert ("otc_allowance", "gte", 100.0, "per_month") in codes(p)


def test_thousands_separator_does_not_split_the_clause():
    p = interpret("plans with dental at least $2,000", default_year=2026)
    assert codes(p) == [("dental_comprehensive_max", "gte", 2000.0, None)]


def test_zero_threshold_is_a_filter_not_a_missing_filter():
    p = interpret("Show 2026 Snohomish plans with $0 PCP and MOOP below $5,000")
    assert ("pcp_copay", "eq", 0.0, None) in codes(p)
    assert ("moop_in_network", "lte", 5000.0, None) in codes(p)


def test_each_threshold_binds_to_its_own_field():
    p = interpret("dental over $2,000 and OTC over $100", default_year=2026)
    got = dict((c[0], c[2]) for c in codes(p))
    assert got == {"dental_comprehensive_max": 2000.0, "otc_allowance": 100.0}


def test_korean_maps_to_the_same_field_codes():
    p = interpret("치과 $2,000 이상이고 OTC가 매달 $100 이상인 플랜 찾아줘", default_year=2026)
    assert p.language == "ko"
    assert ("dental_comprehensive_max", "gte", 2000.0, None) in codes(p)
    assert ("otc_allowance", "gte", 100.0, "per_month") in codes(p)


def test_korean_and_english_resolve_to_one_language_neutral_field():
    assert resolve_field("전문의 진료비가 얼마예요?") == "specialist_copay"
    assert resolve_field("What is the specialist copay?") == "specialist_copay"


def test_ordering_queries():
    p = interpret("Which plans have the lowest MOOP?", default_year=2026)
    assert p.order_by_code == "moop_in_network" and p.order_dir == "asc"


def test_plan_year_is_never_invented():
    p = interpret("plans with dental over $2,000")       # no year, no default
    assert p.plan_year is None


def test_two_years_route_to_year_comparison():
    p = interpret("Compare this plan from 2026 to 2027")
    assert p.route == "compare_years" and p.plan_years == [2026, 2027]


def test_nuance_question_routes_to_evidence_not_structured():
    p = interpret("Does the dental allowance include implants?", default_year=2026)
    assert p.route == "evidence"


def test_llm_cannot_introduce_an_unknown_field():
    class Rogue:
        def interpret_query(self, question, vocab):
            from app.llm.base import LLMResult
            return LLMResult({"filters": [
                {"benefit_code": "secret_bonus_benefit", "op": "gte", "value": 1},
                {"benefit_code": "otc_allowance", "op": "gte", "value": 100,
                 "frequency": "per_fortnight"}]}, "rogue", "m", 1)
    p = interpret("something the regexes cannot parse at all", default_year=2026,
                  provider=Rogue())
    assert all(c[0] in BY_CODE for c in codes(p))
    assert ("otc_allowance", "gte", 100.0, None) in codes(p)   # bad frequency dropped
