from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import ask, compare, documents, facts, plans, search

app = FastAPI(title="Verified Insurance Intelligence API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

for r in (documents.router, facts.router, plans.router, search.router,
          ask.router, compare.router):
    app.include_router(r)


@app.get("/health")
def health():
    return {"ok": True, "llm_provider": settings().llm_provider,
            "strict_evidence_default": settings().strict_evidence_default}


@app.get("/ontology/fields")
def ontology_fields():
    from .ontology.fields import MVP_FIELDS
    return [f.__dict__ for f in MVP_FIELDS]
