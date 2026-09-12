"""Document ingestion pipeline (spec §20). Runs out-of-band; never in a web request."""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass

from ..config import settings
from ..db import audit, q, q1
from ..llm.registry import get_embedder, get_provider
from .chunk import chunk_pages
from .extract import dedupe_and_flag_conflicts, extract_page
from .pdf import parse_pdf


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


@dataclass
class IngestResult:
    document_id: str
    status: str
    facts_written: int
    facts_rejected: int
    conflicts: int
    detail: dict


def _set_status(doc_id: str, status: str, error: str | None = None) -> None:
    q("update documents set ingest_status = %s, ingest_error = %s where id = %s",
      (status, error, doc_id))


def ingest_document(document_id: str) -> IngestResult:
    doc = q1("select * from documents where id = %s", (document_id,))
    if not doc:
        raise ValueError(f"no document {document_id}")
    provider = get_provider(settings().llm_provider)
    rejected = 0

    try:
        # 1-2. parse + persist pages (immutable)
        _set_status(document_id, "parsing")
        pages = parse_pdf(doc["storage_path"])
        q("update documents set page_count = %s, ocr_required = %s where id = %s",
          (len(pages), any(p.needs_ocr for p in pages), document_id))
        for p in pages:
            q("""insert into document_pages (document_id,page_number,text,blocks)
                 values (%s,%s,%s,%s)
                 on conflict (document_id,page_number) do update
                 set text = excluded.text, blocks = excluded.blocks""",
              (document_id, p.page_number, p.text, json.dumps([b.__dict__ for b in p.blocks])))

        # 3. classify from the first pages only
        head = "\n".join(p.text for p in pages[:3])
        meta = provider.classify_document(head).data
        plan = _resolve_plan(doc, meta)
        q("""update documents set carrier_id=%s, plan_id=%s, plan_year=%s,
                 document_type=%s, ingest_status='classified' where id=%s""",
          (plan["carrier_id"], plan["id"], plan["plan_year"],
           meta.get("document_type") or "OTHER", document_id))
        q("""insert into document_versions (document_id, version_label, published_date)
             values (%s,%s,%s)""",
          (document_id, str(meta.get("plan_year") or "v1"), None))

        # 4-8. extract with provenance, validate, conflict-flag
        _set_status(document_id, "extracting")
        cands = []
        for p in pages:
            cands.extend(extract_page(provider, p, plan_year=plan["plan_year"],
                                      document_plan_year=meta.get("plan_year")))
        rejected = sum(1 for c in cands if c.verdict.status == "rejected")
        kept, conflicts = dedupe_and_flag_conflicts(cands)

        written = [_write_fact(doc, plan, c) for c in kept]
        for a, b in conflicts:
            fa, fb = _write_fact(doc, plan, a, force_status="conflict"), \
                     _write_fact(doc, plan, b, force_status="conflict")
            q("""insert into fact_conflicts (agency_id,plan_id,plan_year,benefit_code,fact_a,fact_b)
                 values (%s,%s,%s,%s,%s,%s)""",
              (doc["agency_id"], plan["id"], plan["plan_year"],
               a.fact["benefit_code"], fa, fb))

        # 9. chunk + embed
        _set_status(document_id, "embedded")
        _write_chunks(doc, plan, pages, meta)
        _set_status(document_id, "ready")

        audit(str(doc["agency_id"]), None, "document.ingest", "document", document_id,
              {"facts": len(written), "rejected": rejected, "conflicts": len(conflicts)})
        return IngestResult(document_id, "ready", len(written), rejected, len(conflicts),
                            {"plan_id": str(plan["id"]), "plan_year": plan["plan_year"],
                             "pages": len(pages)})
    except Exception as exc:  # noqa: BLE001 - surface the failure on the document row
        _set_status(document_id, "failed", f"{type(exc).__name__}: {exc}")
        raise


def _resolve_plan(doc: dict, meta: dict) -> dict:
    """Find or create the plan row. Plan year is part of identity, so a 2027 document
    can never attach to the 2026 plan row (spec §11)."""
    if not meta.get("plan_year"):
        raise ValueError("classification produced no plan_year; refusing to guess")
    carrier = q1("select id from carriers where short_name = %s",
                 (meta.get("carrier_short_name") or "",))
    if not carrier:
        carrier = q1("""insert into carriers (name, short_name) values (%s,%s)
                        returning id""",
                     (meta.get("carrier_short_name") or "UNKNOWN",
                      meta.get("carrier_short_name") or "UNKNOWN"))
    contract = meta.get("contract_id")
    pbp = meta.get("pbp")
    existing = q1("""select * from plans where carrier_id=%s and contract_id is not distinct from %s
                     and pbp is not distinct from %s and segment_id='000' and plan_year=%s""",
                  (carrier["id"], contract, pbp, meta["plan_year"]))
    if existing:
        return existing
    ext = f"{contract}-{pbp}-000" if contract and pbp else None
    return q1("""insert into plans (carrier_id, plan_name, contract_id, pbp, plan_id_ext,
                    plan_year, org_type, snp)
                 values (%s,%s,%s,%s,%s,%s,%s,%s) returning *""",
              (carrier["id"], meta.get("plan_name") or "UNNAMED PLAN", contract, pbp, ext,
               meta["plan_year"], _org(meta.get("org_type")), _snp(meta.get("snp_type"))))


def _org(v: str | None) -> str | None:
    m = {"HMO": "HMO", "HMO-POS": "HMO_POS", "PPO": "PPO_LOCAL", "PFFS": "PFFS"}
    return m.get((v or "").upper())


def _snp(v: str | None) -> str:
    v = (v or "NONE").upper()
    return v if v in ("NONE", "DSNP", "CSNP", "ISNP") else "NONE"


def _write_fact(doc: dict, plan: dict, c, force_status: str | None = None) -> str:
    f = c.fact
    row = q1("""insert into extracted_facts
        (agency_id,plan_id,plan_year,benefit_code,value_numeric,value_text,value_boolean,
         unit,frequency,is_conditional,conditions,limits,network_scope,
         extraction_confidence,verification_status,extracted_by_model)
        values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id""",
        (doc["agency_id"], plan["id"], plan["plan_year"], f["benefit_code"],
         f.get("value_numeric"), f.get("value_text"), f.get("value_boolean"),
         f.get("unit"), f.get("frequency") or "not_applicable",
         bool(f.get("is_conditional")), f.get("conditions"), f.get("limits"),
         f.get("network_scope"), f.get("confidence"),
         force_status or c.verdict.status, f.get("extracted_by_model")))
    q("""insert into fact_sources (fact_id,source_kind,document_id,page_number,source_text,bbox)
         values (%s,'carrier_document',%s,%s,%s,%s)""",
      (row["id"], doc["id"], c.page_number, f["source_text"],
       json.dumps(c.bbox) if c.bbox else None))
    return str(row["id"])


def _write_chunks(doc: dict, plan: dict, pages, meta: dict) -> None:
    chunks = chunk_pages(pages)
    embedder = get_embedder(settings().embed_provider)
    vectors = embedder.embed([c.text for c in chunks]) if chunks else []
    for c, vec in zip(chunks, vectors):
        q("""insert into document_chunks
             (document_id,agency_id,page_number,chunk_index,section,text,plan_id,plan_year,
              carrier_id,document_type,embedding)
             values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector)
             on conflict (document_id,chunk_index) do nothing""",
          (doc["id"], doc["agency_id"], c.page_number, c.chunk_index, c.section, c.text,
           plan["id"], plan["plan_year"], plan["carrier_id"],
           meta.get("document_type") or "OTHER", str(vec)))


def store_upload(agency_id: str, user_id: str, filename: str, data: bytes) -> tuple[str, bool]:
    """Content-addressed storage with dedupe (spec §48). Returns (document_id, is_new)."""
    digest = hashlib.sha256(data).hexdigest()
    existing = q1("select id from documents where agency_id=%s and content_sha256=%s",
                  (agency_id, digest))
    if existing:
        return str(existing["id"]), False
    root = os.path.join(settings().storage_dir, agency_id)
    os.makedirs(root, exist_ok=True)
    path = os.path.join(root, f"{digest}.pdf")
    with open(path, "wb") as fh:      # original preserved byte-for-byte, never rewritten
        fh.write(data)
    row = q1("""insert into documents
                (agency_id,original_filename,storage_path,content_sha256,uploaded_by)
                values (%s,%s,%s,%s,%s) returning id""",
             (agency_id, filename, path, digest, user_id))
    audit(agency_id, user_id, "document.upload", "document", str(row["id"]),
          {"filename": filename, "sha256": digest})
    return str(row["id"]), True
