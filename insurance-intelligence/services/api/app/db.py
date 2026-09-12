from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

from .config import settings

# psycopg is imported lazily: the pure-logic modules (ontology, validation, retrieval
# query construction) must be importable and testable without a database driver.

_pool = None


def _get_pool():
    global _pool
    if _pool is None:
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool
        _pool = ConnectionPool(settings().database_url, min_size=1, max_size=10,
                               kwargs={"row_factory": dict_row})
    return _pool


@contextmanager
def conn() -> Iterator[Any]:
    with _get_pool().connection() as c:
        yield c


def q(sql: str, params: dict | tuple | None = None) -> list[dict[str, Any]]:
    with conn() as c, c.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else []


def q1(sql: str, params: dict | tuple | None = None) -> dict[str, Any] | None:
    rows = q(sql, params)
    return rows[0] if rows else None


def audit(agency_id: str, user_id: str | None, action: str,
          entity_type: str | None = None, entity_id: str | None = None,
          detail: dict | None = None) -> None:
    import json
    q("""insert into audit_logs (agency_id,user_id,action,entity_type,entity_id,detail)
         values (%(a)s,%(u)s,%(ac)s,%(et)s,%(ei)s,%(d)s)""",
      {"a": agency_id, "u": user_id, "ac": action, "et": entity_type,
       "ei": entity_id, "d": json.dumps(detail or {})})
