#!/usr/bin/env python3
"""Development seed: one agency, three users (agent/reviewer/admin), three WA counties,
and a synthetic 2026 SOB PDF ingested end-to-end.

Usage:  DATABASE_URL=... python scripts/seed_dev.py
Requires migrations 0001 and 0002 to have been applied.
"""
from __future__ import annotations

import os
import pathlib
import sys
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api"))

from app.db import q, q1                                    # noqa: E402
from app.ingest.pipeline import ingest_document, store_upload  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "sample_sob_page.txt"

USERS = [("agent@example.com", "agent"), ("reviewer@example.com", "reviewer"),
         ("admin@example.com", "agency_admin")]


def make_pdf(text: str, out: pathlib.Path) -> pathlib.Path:
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((54, 60), text, fontsize=9)
    doc.save(out)
    doc.close()
    return out


def main() -> None:
    agency = q1("select * from agencies where name='Dev Agency'") or q1(
        "insert into agencies (name) values ('Dev Agency') returning *")
    aid = str(agency["id"])
    ids = {}
    for email, role in USERS:
        row = q1("select * from app_users where email=%s", (email,)) or q1(
            "insert into app_users (id,agency_id,email,role) values (%s,%s,%s,%s) returning *",
            (str(uuid.uuid4()), aid, email, role))
        ids[role] = str(row["id"])

    for short, name in (("UHC", "UnitedHealthcare"), ("HUMANA", "Humana"), ("AETNA", "Aetna")):
        q("""insert into carriers (name, short_name) values (%s,%s)
             on conflict (short_name) do nothing""", (name, short))

    tmp = ROOT / "var"
    tmp.mkdir(exist_ok=True)
    pdf = make_pdf(FIXTURE.read_text(), tmp / "seed_sob_2026.pdf")
    doc_id, is_new = store_upload(aid, ids["agency_admin"], "seed_sob_2026.pdf",
                                  pdf.read_bytes())
    if is_new:
        result = ingest_document(doc_id)
        plan_id = result.detail["plan_id"]
        for county in ("Snohomish", "King", "Pierce"):
            q("""insert into plan_service_areas (plan_id,state,county) values (%s,'WA',%s)
                 on conflict do nothing""", (plan_id, county))
        print(f"ingested {doc_id}: {result.facts_written} facts, "
              f"{result.facts_rejected} rejected, {result.conflicts} conflicts")
    else:
        print(f"document {doc_id} already present")

    print("\nagency_id:", aid)
    for role, uid in ids.items():
        print(f"  X-User-Id ({role}): {uid}")


if __name__ == "__main__":
    if not os.getenv("DATABASE_URL"):
        sys.exit("set DATABASE_URL first")
    main()
