#!/usr/bin/env python3
"""Benchmark runner (spec §37-38).

Scores only what can be scored deterministically:
  - route, filters and ordering come from the interpreter (no API, no network)
  - refusal / citation / value checks require a live API + an ingested corpus

Usage:
  python tests/benchmark/run_benchmark.py                  # interpreter-only scoring
  API=http://localhost:8000 USER_ID=... PLAN_ID=... \
      python tests/benchmark/run_benchmark.py --live       # full scoring
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.query.nl_to_filters import interpret  # noqa: E402

QUESTIONS = pathlib.Path(__file__).with_name("questions.jsonl")


def score_interpretation(case: dict) -> tuple[bool, str]:
    exp = case["expect"]
    p = interpret(case["q"], default_year=2026)
    if "route" in exp and p.route != exp["route"]:
        return False, f"route {p.route} != {exp['route']}"
    if "years" in exp and p.plan_years != exp["years"]:
        return False, f"years {p.plan_years} != {exp['years']}"
    if "order_by" in exp:
        if p.order_by_code != exp["order_by"]:
            return False, f"order_by {p.order_by_code} != {exp['order_by']}"
        if p.order_dir != exp.get("direction", p.order_dir):
            return False, f"direction {p.order_dir}"
    if "county" in exp and exp["county"] not in p.counties:
        return False, f"counties {p.counties}"
    if "filters" in exp:
        got = {(f.benefit_code, f.op, f.value) for f in p.filters}
        want = {(c, o, float(v)) for c, o, v in exp["filters"]}
        if not want <= got:
            return False, f"filters {sorted(got)} missing {sorted(want - got)}"
    return True, "ok"


SCORABLE = {"filters", "cross_plan", "plan_year", "korean"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true")
    args = ap.parse_args()
    if args.live:
        print("live scoring requires an ingested corpus; not implemented in Milestone 1",
              file=sys.stderr)

    cases = [json.loads(ln) for ln in QUESTIONS.read_text().splitlines() if ln.strip()]
    by_cat: Counter[str] = Counter()
    ok_by_cat: Counter[str] = Counter()
    failures = []
    for c in cases:
        if c["category"] not in SCORABLE:
            continue
        by_cat[c["category"]] += 1
        ok, why = score_interpretation(c)
        if ok:
            ok_by_cat[c["category"]] += 1
        else:
            failures.append((c["id"], c["q"], why))

    total, good = sum(by_cat.values()), sum(ok_by_cat.values())
    for cat in sorted(by_cat):
        print(f"{cat:24s} {ok_by_cat[cat]}/{by_cat[cat]}")
    print(f"{'TOTAL (interpretation)':24s} {good}/{total}")
    for fid, q, why in failures:
        print(f"  FAIL {fid}: {q}\n       {why}")
    print(f"\n{len(cases) - total} cases require a live corpus and are not scored here.")
    return 0 if good == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
