"""Deterministic provider used by the entire test suite and by `make dev` without keys.

It is NOT a stub that returns empty: it performs real regex extraction over the page
text, so tests exercise the anchor check, the validators and the conflict logic with
realistic inputs and zero API cost.
"""
from __future__ import annotations

import re
import time
import hashlib
from .base import LLMResult

_MONEY = r"\$\s?([0-9][0-9,]*(?:\.\d{2})?)"

# (benefit_code, page-line matcher, default frequency)
_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    ("monthly_premium",          re.compile(rf"monthly plan premium[^$\n]*{_MONEY}", re.I), "per_month"),
    ("moop_in_network",          re.compile(rf"maximum out[- ]of[- ]pocket[^$\n]*{_MONEY}", re.I), "per_year"),
    ("pcp_copay",                re.compile(rf"primary care[^$\n]*{_MONEY}", re.I), "per_visit"),
    ("specialist_copay",         re.compile(rf"specialist[^$\n]*{_MONEY}", re.I), "per_visit"),
    ("urgent_care_copay",        re.compile(rf"urgent(?:ly needed)? care[^$\n]*{_MONEY}", re.I), "per_visit"),
    ("emergency_room_copay",     re.compile(rf"emergency (?:room|care)[^$\n]*{_MONEY}", re.I), "per_visit"),
    ("outpatient_hospital",      re.compile(rf"outpatient (?:hospital|surgery)[^$\n]*{_MONEY}", re.I), "per_visit"),
    ("dental_comprehensive_max", re.compile(rf"comprehensive dental[^$\n]*{_MONEY}", re.I), "per_year"),
    ("vision_eyewear_allowance", re.compile(rf"eyewear[^$\n]*{_MONEY}", re.I), "per_year"),
    ("hearing_aid_allowance",    re.compile(rf"hearing aid[^$\n]*{_MONEY}", re.I), "per_year"),
    ("drug_deductible",          re.compile(rf"(?:part d |drug )deductible[^$\n]*{_MONEY}", re.I), "per_year"),
    ("rx_tier1_preferred_30",    re.compile(rf"tier 1[^$\n]*{_MONEY}", re.I), "per_item"),
    ("rx_tier2_preferred_30",    re.compile(rf"tier 2[^$\n]*{_MONEY}", re.I), "per_item"),
    ("part_b_giveback",          re.compile(rf"part b (?:premium )?(?:reduction|giveback)[^$\n]*{_MONEY}", re.I), "per_month"),
]

# frequency words that, when present on the line, override the default
_FREQ_WORDS = [
    (re.compile(r"\bper month\b|\bmonthly\b|/month\b|\ba month\b", re.I), "per_month"),
    (re.compile(r"\bper quarter\b|\bquarterly\b|/quarter\b", re.I), "per_quarter"),
    (re.compile(r"\bper year\b|\bannual(?:ly)?\b|/year\b|\ba year\b", re.I), "per_year"),
    (re.compile(r"\bper day\b|\beach day\b|\bdays? 1\b", re.I), "per_day"),
    (re.compile(r"\bper stay\b|\beach stay\b", re.I), "per_stay"),
]


def _freq(line: str, default: str) -> str:
    for pat, f in _FREQ_WORDS:
        if pat.search(line):
            return f
    return default


class MockProvider:
    name = "mock"
    model = "mock-deterministic-1"

    def _r(self, data, t0):
        return LLMResult(data=data, provider=self.name, model=self.model,
                         latency_ms=int((time.time() - t0) * 1000))

    def classify_document(self, first_pages: str) -> LLMResult:
        t0 = time.time()
        yr = re.search(r"\b(20\d{2})\b", first_pages)
        contract = re.search(r"\b(H\d{4})\s*[-–]?\s*(\d{3})?", first_pages)
        carrier = None
        for short, pat in (("UHC", r"UnitedHealthcare|UHC"), ("HUMANA", r"Humana"),
                           ("AETNA", r"Aetna")):
            if re.search(pat, first_pages, re.I):
                carrier = short
                break
        name = re.search(r"^\s*(.*(?:Plan|HMO|PPO).*)$", first_pages, re.M)
        dtype = "SOB" if re.search(r"summary of benefits", first_pages, re.I) else "OTHER"
        org = next((o for o in ("HMO-POS", "PPO", "HMO") if o.lower() in first_pages.lower()), None)
        snp = next((s for s in ("DSNP", "CSNP", "ISNP") if s.lower() in first_pages.lower()), "NONE")
        return self._r({
            "carrier_short_name": carrier,
            "document_type": dtype,
            "plan_year": int(yr.group(1)) if yr else None,
            "plan_name": name.group(1).strip() if name else None,
            "contract_id": contract.group(1) if contract else None,
            "pbp": contract.group(2) if contract and contract.group(2) else None,
            "org_type": org, "snp_type": snp, "confidence": 0.9,
        }, t0)

    def extract_structured_data(self, page_text: str, page_number: int, fields) -> LLMResult:
        t0 = time.time()
        allowed = {f["code"] for f in fields}
        facts = []
        for line in page_text.splitlines():
            for code, pat, default_freq in _PATTERNS:
                if code not in allowed:
                    continue
                m = pat.search(line)
                if not m:
                    continue
                facts.append({
                    "benefit_code": code,
                    "value_numeric": float(m.group(1).replace(",", "")),
                    "value_text": None, "value_boolean": None, "unit": "USD",
                    "frequency": _freq(line, default_freq),
                    "network_scope": "in_network",
                    "is_conditional": bool(re.search(r"chronic|qualif|eligible members", line, re.I)),
                    "conditions": None, "limits": None,
                    "source_text": line.strip(),
                    "confidence": 0.85,
                })
        return self._r({"facts": facts}, t0)

    def interpret_query(self, question: str, vocabulary) -> LLMResult:
        t0 = time.time()
        # Deliberately minimal: the deterministic interpreter in query/nl_to_filters.py
        # does the real work; the provider only reports what it could not resolve.
        return self._r({"route": "structured", "plan_year": None, "filters": [],
                        "language": "ko" if re.search(r"[가-힣]", question) else "en"}, t0)

    def summarize_evidence(self, question: str, passages) -> LLMResult:
        t0 = time.time()
        # Word-overlap grounding: answer only from a passage that shares content words.
        q = {w for w in re.findall(r"[a-z0-9]{4,}", question.lower())}
        for i, p in enumerate(passages):
            words = set(re.findall(r"[a-z0-9]{4,}", p["text"].lower()))
            if len(q & words) >= 2:
                return self._r({"answer": p["text"].strip(), "refused": False,
                                "citation_indices": [i]}, t0)
        return self._r({"answer": "Unable to verify from the available carrier documents.",
                        "refused": True, "citation_indices": []}, t0)

    def translate(self, text: str, target: str) -> LLMResult:
        return self._r({"text": text}, time.time())

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Stable hash embedding. Not semantic - it only has to be deterministic and
        dimension-correct so pgvector paths are exercised in tests."""
        out = []
        for t in texts:
            h = hashlib.sha256(t.encode()).digest()
            vec = [((h[i % 32] / 255.0) - 0.5) for i in range(1536)]
            norm = sum(v * v for v in vec) ** 0.5 or 1.0
            out.append([v / norm for v in vec])
        return out
