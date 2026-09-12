from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header, HTTPException

from .db import q1


@dataclass
class Principal:
    user_id: str
    agency_id: str
    role: str


def current_principal(x_user_id: str = Header(..., alias="X-User-Id")) -> Principal:
    """MVP auth shim.

    Production path: Supabase JWT -> auth.uid() -> RLS does the isolation in the DB.
    This header form exists so the API is runnable locally; every query still filters
    by agency_id explicitly, so the tenant boundary does not depend on the shim.
    """
    row = q1("select id, agency_id, role from app_users where id = %s", (x_user_id,))
    if not row:
        raise HTTPException(401, "unknown user")
    return Principal(str(row["id"]), str(row["agency_id"]), row["role"])


def require_reviewer(p: Principal) -> Principal:
    if p.role not in ("reviewer", "agency_admin", "platform_admin"):
        raise HTTPException(403, "reviewer role required")
    return p
