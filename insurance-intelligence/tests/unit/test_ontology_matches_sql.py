"""Guards drift between the Python ontology and the SQL seed (the two are used by
different layers; a silent divergence produces facts the DB will reject at insert)."""
import pathlib
import re

from app.ontology.fields import BY_CODE, MVP_FIELDS

SQL = (pathlib.Path(__file__).resolve().parents[2] / "supabase" / "migrations"
       / "0002_benefit_types_mvp.sql").read_text()
MVP_BODY = SQL.split("-- Stage 2")[0]

# ('code', 'cat', 'label_en', 'label_ko', 'kind', unit, frequency_required, is_mvp, sort, ...)
ROW = re.compile(
    r"\('(?P<code>[a-z0-9_]+)',.*?,\s*(?P<freq_required>true|false),"
    r"\s*(?P<is_mvp>true|false),\s*(?P<sort>\d+)\s*,",
    re.S)


def sql_rows() -> dict[str, dict]:
    out = {}
    for m in ROW.finditer(MVP_BODY):
        out[m.group("code")] = {"frequency_required": m.group("freq_required") == "true",
                                "is_mvp": m.group("is_mvp") == "true",
                                "sort": int(m.group("sort"))}
    return out


def test_same_twenty_codes_on_both_sides():
    assert set(sql_rows()) == set(BY_CODE)
    assert len(MVP_FIELDS) == 20


def test_frequency_required_flags_agree():
    rows = sql_rows()
    mismatched = [f.code for f in MVP_FIELDS
                  if rows[f.code]["frequency_required"] != f.frequency_required]
    assert not mismatched, f"frequency_required drift: {mismatched}"


def test_all_mvp_rows_are_flagged_is_mvp():
    assert all(r["is_mvp"] for r in sql_rows().values())


def test_never_aliased_pairs_are_distinct_codes():
    from app.ontology.fields import NEVER_ALIAS
    for a, b in NEVER_ALIAS:
        assert a != b
        assert a in BY_CODE or b in BY_CODE
