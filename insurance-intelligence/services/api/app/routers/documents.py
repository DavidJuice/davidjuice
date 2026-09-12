from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..db import q, q1
from ..deps import Principal, current_principal
from ..ingest.pipeline import ingest_document, store_upload

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
def upload(bg: BackgroundTasks, file: UploadFile = File(...),
           p: Principal = Depends(current_principal)):
    data = file.file.read()
    if len(data) > settings().max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f"file exceeds {settings().max_upload_mb}MB")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(415, "MVP accepts PDF only")
    doc_id, is_new = store_upload(p.agency_id, p.user_id, file.filename, data)
    if is_new:
        # PDF parsing is CPU-bound; it must not block the request (spec §45).
        bg.add_task(ingest_document, doc_id)
    return {"document_id": doc_id, "duplicate": not is_new}


@router.get("/{doc_id}")
def get_document(doc_id: str, p: Principal = Depends(current_principal)):
    row = q1("""select d.*, c.short_name as carrier, pl.plan_name, pl.plan_id_ext
                from documents d
                left join carriers c on c.id = d.carrier_id
                left join plans pl on pl.id = d.plan_id
                where d.id = %s and d.agency_id = %s""", (doc_id, p.agency_id))
    if not row:
        raise HTTPException(404, "not found")
    return row


@router.post("/{doc_id}/extract")
def reextract(doc_id: str, p: Principal = Depends(current_principal)):
    if not q1("select 1 from documents where id=%s and agency_id=%s", (doc_id, p.agency_id)):
        raise HTTPException(404, "not found")
    return ingest_document(doc_id).__dict__


@router.get("/{doc_id}/facts")
def document_facts(doc_id: str, p: Principal = Depends(current_principal)):
    return q("""select f.*, bt.label_en, bt.label_ko, bt.category, bt.sort_order,
                   s.page_number, s.source_text, s.section, s.bbox
                from extracted_facts f
                join benefit_types bt on bt.code = f.benefit_code
                join fact_sources s on s.fact_id = f.id
                where s.document_id = %s and f.agency_id = %s
                order by bt.sort_order""", (doc_id, p.agency_id))


@router.get("/{doc_id}/pages/{page_number}")
def page_text(doc_id: str, page_number: int, p: Principal = Depends(current_principal)):
    row = q1("""select pg.page_number, pg.text from document_pages pg
                join documents d on d.id = pg.document_id
                where pg.document_id=%s and pg.page_number=%s and d.agency_id=%s""",
             (doc_id, page_number, p.agency_id))
    if not row:
        raise HTTPException(404, "not found")
    return row
