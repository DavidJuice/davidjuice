import { api, renderValue, type Fact } from "@/lib/api";
import ReviewRow from "./ReviewRow";

type QueueItem = Fact & {
  plan_name: string;
  plan_id_ext: string | null;
  plan_year: number;
  original_filename: string;
};

export default async function ReviewQueue({
  searchParams,
}: {
  searchParams: Promise<{ document?: string }>;
}) {
  const { document } = await searchParams;
  let items: QueueItem[] = [];
  let error: string | null = null;
  try {
    items = document
      ? await api<QueueItem[]>(`/documents/${document}/facts`)
      : await api<QueueItem[]>("/facts/review-queue");
  } catch (e) {
    error = String(e);
  }

  const pending = items.filter((f) => f.verification_status !== "verified");

  return (
    <>
      <h1>Extraction review</h1>
      <p className="muted">
        Every value is shown beside the verbatim text it came from and the page it sits on.
        A correction never overwrites the original extraction — it supersedes it, and both
        stay in the audit history.
      </p>
      {error && <div className="notice">API unreachable: {error}</div>}
      {!error && pending.length === 0 && <p>Nothing awaiting review.</p>}

      <table>
        <thead>
          <tr>
            <th style={{ width: "22%" }}>Benefit</th>
            <th style={{ width: "16%" }}>Extracted value</th>
            <th>Source evidence</th>
            <th style={{ width: "18%" }}>Decision</th>
          </tr>
        </thead>
        <tbody>
          {pending.map((f) => (
            <tr key={f.id}>
              <td>
                <div>{f.label_en}</div>
                <div className="muted" style={{ fontSize: 12 }}>{f.label_ko}</div>
                <div className="muted" style={{ fontSize: 11 }}>{f.benefit_code}</div>
              </td>
              <td>
                <div>{renderValue(f)}</div>
                <span className={`badge ${f.verification_status}`}>
                  {f.verification_status.replace("_", " ")}
                </span>
                {f.is_conditional && (
                  <div className="badge conflict" style={{ marginTop: 4 }}>conditional</div>
                )}
              </td>
              <td>
                <div className="muted" style={{ fontSize: 12 }}>
                  {f.original_filename ?? "document"} · page {f.page_number}
                  {f.section ? ` · ${f.section}` : ""}
                </div>
                <div className="src">{f.source_text}</div>
                {f.limits && <div className="muted">Limits: {f.limits}</div>}
                {f.conditions && <div className="muted">Conditions: {f.conditions}</div>}
              </td>
              <td><ReviewRow factId={f.id} current={f.value_numeric} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
