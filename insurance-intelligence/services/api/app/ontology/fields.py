"""MVP insurance ontology (spec §22/§35).

Single source of truth in the API layer; mirrors supabase/migrations/0002.
Kept in code as well as SQL because the extractor prompt, the validators and the
NL->filter interpreter all need the field vocabulary without a DB round-trip.
A drift test (tests/unit/test_ontology_matches_sql.py) asserts the two agree.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

ValueKind = Literal["currency", "percent", "boolean", "text", "count", "copay_or_coins"]

FREQUENCIES = (
    "per_month", "per_quarter", "per_year", "per_visit", "per_day", "per_stay",
    "per_admission", "per_trip", "per_item", "per_pair", "one_time", "not_applicable",
)

# frequencies that are NEVER interchangeable. Guards spec §40 "wrong frequency".
MONETARY_PERIODS = {"per_month": 12, "per_quarter": 4, "per_year": 1}


@dataclass(frozen=True)
class BenefitType:
    code: str
    category: str
    label_en: str
    label_ko: str
    value_kind: ValueKind
    frequency_required: bool
    allowed_frequencies: tuple[str, ...] = FREQUENCIES
    # substrings that identify this field in a question. Deterministic routing beats
    # asking a model "which field is this" for the 20 fields we actually know.
    aliases: tuple[str, ...] = field(default_factory=tuple)
    max_plausible: float | None = None
    notes: str = ""


MVP_FIELDS: tuple[BenefitType, ...] = (
    BenefitType("plan_type", "plan", "Plan Type", "플랜 유형", "text", False,
                aliases=("plan type", "hmo", "ppo", "플랜 유형")),
    BenefitType("snp_type", "plan", "SNP Type", "SNP 유형", "text", False,
                aliases=("snp", "dsnp", "csnp", "special needs")),
    BenefitType("monthly_premium", "cost", "Monthly Plan Premium", "월 보험료", "currency", True,
                ("per_month",), aliases=("premium", "monthly premium", "보험료"), max_plausible=600),
    BenefitType("part_b_giveback", "cost", "Part B Premium Reduction", "Part B 환급", "currency", True,
                ("per_month",), aliases=("giveback", "give back", "part b reduction", "buy down"),
                max_plausible=200),
    BenefitType("moop_in_network", "cost", "MOOP (In-Network)", "본인부담 상한 (네트워크 내)", "currency", True,
                ("per_year",), aliases=("moop", "out-of-pocket maximum", "maximum out of pocket", "상한"),
                max_plausible=15000),
    BenefitType("drug_deductible", "rx", "Part D Drug Deductible", "약제 공제액", "currency", True,
                ("per_year",), aliases=("drug deductible", "rx deductible", "part d deductible", "약제 공제"),
                max_plausible=2000),
    BenefitType("pcp_copay", "medical", "Primary Care Copay", "주치의 진료비", "copay_or_coins", True,
                ("per_visit",), aliases=("pcp", "primary care", "주치의"), max_plausible=200),
    BenefitType("specialist_copay", "medical", "Specialist Copay", "전문의 진료비", "copay_or_coins", True,
                ("per_visit",), aliases=("specialist", "전문의"), max_plausible=300),
    BenefitType("urgent_care_copay", "medical", "Urgent Care Copay", "긴급진료 비용", "copay_or_coins", True,
                ("per_visit",), aliases=("urgent care", "긴급진료"), max_plausible=200),
    BenefitType("emergency_room_copay", "medical", "Emergency Room Copay", "응급실 비용", "copay_or_coins", True,
                ("per_visit",), aliases=("emergency room", "er copay", "응급실"), max_plausible=1000),
    BenefitType("inpatient_hospital", "medical", "Inpatient Hospital", "입원 비용", "copay_or_coins", True,
                ("per_day", "per_stay", "per_admission"),
                aliases=("inpatient", "hospital stay", "입원"), max_plausible=3000),
    BenefitType("outpatient_hospital", "medical", "Outpatient Hospital", "외래 병원 비용", "copay_or_coins", True,
                ("per_visit",), aliases=("outpatient", "외래"), max_plausible=1500),
    BenefitType("dental_comprehensive_max", "supplemental", "Comprehensive Dental Max", "종합 치과 한도",
                "currency", True, ("per_year",),
                aliases=("dental maximum", "dental max", "comprehensive dental",
                         "dental allowance", "dental", "치과"),
                max_plausible=10000),
    BenefitType("vision_eyewear_allowance", "supplemental", "Eyewear Allowance", "안경 보조금",
                "currency", True, ("per_year", "per_item", "per_pair"),
                aliases=("eyewear", "eyeglasses", "vision allowance", "glasses", "안경"),
                max_plausible=1000),
    BenefitType("hearing_aid_allowance", "supplemental", "Hearing Aid Allowance", "보청기 보조금",
                "currency", True, ("per_year", "per_pair", "per_item"),
                aliases=("hearing aid", "보청기"), max_plausible=6000),
    BenefitType("otc_allowance", "supplemental", "OTC Allowance", "OTC 보조금", "currency", True,
                ("per_month", "per_quarter", "per_year"),
                aliases=("otc", "over-the-counter", "over the counter"), max_plausible=500),
    BenefitType("transportation_trips", "supplemental", "Transportation Trips", "교통 지원 횟수",
                "count", True, ("per_year", "per_trip"),
                aliases=("transportation", "rides", "trips", "교통"), max_plausible=200),
    BenefitType("fitness_benefit", "supplemental", "Fitness Benefit", "피트니스 혜택", "text", False,
                aliases=("fitness", "gym", "silversneakers", "renew active", "피트니스")),
    BenefitType("rx_tier1_preferred_30", "rx", "Tier 1 - 30d Preferred", "1등급 30일 선호약국",
                "copay_or_coins", True, ("per_item",),
                aliases=("tier 1", "tier1", "1등급"), max_plausible=100),
    BenefitType("rx_tier2_preferred_30", "rx", "Tier 2 - 30d Preferred", "2등급 30일 선호약국",
                "copay_or_coins", True, ("per_item",),
                aliases=("tier 2", "tier2", "2등급"), max_plausible=150),
)

BY_CODE: dict[str, BenefitType] = {f.code: f for f in MVP_FIELDS}

# Fields that are routinely confused and must never be treated as synonyms (§40).
NEVER_ALIAS: tuple[tuple[str, str], ...] = (
    ("otc_allowance", "flex_allowance"),
    ("otc_allowance", "food_allowance"),
    ("dental_comprehensive_max", "dental_preventive"),
)


def resolve_field(text: str) -> str | None:
    """Deterministic field lookup from free text. Longest alias wins.

    Returns None rather than guessing; the caller then falls back to the LLM
    interpreter, which can only return a code that exists in BY_CODE.
    """
    low = text.lower()
    best: tuple[int, str] | None = None
    for f in MVP_FIELDS:
        for alias in f.aliases:
            if alias in low and (best is None or len(alias) > best[0]):
                best = (len(alias), f.code)
    return best[1] if best else None
