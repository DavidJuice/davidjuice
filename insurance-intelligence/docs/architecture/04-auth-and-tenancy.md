# Authentication, Tenancy, Privacy

## Tenant boundary

`agency_id` on every tenant table + Postgres RLS keyed on `auth.uid()` (migration 0001).
The boundary lives in the database, so a missing filter in application code cannot leak
across agencies.

Tenant tables: `documents`, `document_chunks`, `extracted_facts`, `fact_conflicts`,
`questions`, `audit_logs`, `app_users`.
Shared reference tables (`carriers`, `plans`, `benefit_types`, `plan_service_areas`) carry
no agency data — plan identity is public information.

Child tables (`document_pages`, `fact_sources`, `citations`, `answers`) are only reachable
through a join to an RLS-protected parent and have no direct API route.

## Roles

`platform_admin > agency_admin > manager > reviewer > agent`. Verification
(`POST /facts/{id}/verify`) requires reviewer or above. Agents read.

## Current state vs production

The MVP API resolves the principal from an `X-User-Id` header (`deps.current_principal`)
so the stack runs locally with no identity provider. **Every query still filters by
`agency_id` explicitly** — the shim is a convenience, not the boundary. Production replaces
it with a Supabase JWT; RLS then enforces the same boundary independently.

## Privacy scope (spec §25)

No client PHI/PII in the MVP, enforced structurally: there are no client, member, or
enrollment tables. There is nowhere to put an MBI, a DOB, or a medication list. Adding
one is a schema change that forces a security review, which is the point.

`audit_logs` records document uploads, extraction runs, review decisions, searches and
answer generation, with the provider and model used. Question text is stored (it is agent
research, not client data); do not relax that assumption once client features exist.

## Document rights

Carrier PDFs are stored per-agency and never pooled into a shared corpus. See risks R9.3 —
this constrains any cross-tenant data-network effect and must not be quietly reversed.
