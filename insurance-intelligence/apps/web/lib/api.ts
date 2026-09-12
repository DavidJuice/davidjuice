const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// MVP auth shim: the API resolves tenant + role from this header. Replaced by a
// Supabase JWT in production - see docs/architecture/04-auth-and-tenancy.md.
export function userId(): string {
  return process.env.NEXT_PUBLIC_DEV_USER_ID ?? "";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "X-User-Id": userId(), ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export type Status = "verified" | "extracted" | "needs_review" | "conflict" | "rejected";

export type Fact = {
  id: string;
  benefit_code: string;
  label_en: string;
  label_ko: string;
  category: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  frequency: string;
  limits: string | null;
  conditions: string | null;
  is_conditional: boolean;
  verification_status: Status;
  document_id: string | null;
  page_number: number | null;
  section: string | null;
  source_text: string | null;
};

export function renderValue(f: Fact): string {
  if (f.value_numeric !== null) {
    const v = f.unit === "USD"
      ? `$${f.value_numeric.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : String(f.value_numeric);
    // Frequency is ALWAYS shown. A bare "$100" is the wrong-frequency bug waiting to
    // happen - the agent must see /month vs /quarter at a glance.
    return f.frequency === "not_applicable" ? v : `${v} / ${f.frequency.replace("per_", "")}`;
  }
  return f.value_text ?? "—";
}
