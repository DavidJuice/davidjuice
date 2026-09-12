import { api, renderValue, type Fact } from "@/lib/api";
import AskPlan from "./AskPlan";

type Detail = {
  plan: {
    id: string; plan_name: string; plan_id_ext: string | null; plan_year: number;
    carrier: string; org_type: string | null; snp: string;
  };
  service_areas: { state: string; county: string }[];
  benefits: Fact[];
  documents: { id: string; original_filename: string; document_type: string }[];
  strict_evidence_mode: boolean;
};

const ORDER = ["plan", "cost", "medical", "supplemental", "rx"];

export default async function PlanDetail({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  let d: Detail;
  try {
    d = await api<Detail>(`/plans/${planId}?strict=true`);
  } catch (e) {
    return <div className="notice">Could not load plan: {String(e)}</div>;
  }

  const groups = ORDER.map((cat) => ({
    cat,
    rows: d.benefits.filter((b) => b.category === cat),
  })).filter((g) => g.rows.length);

  return (
    <>
      <h1>{d.plan.plan_name}</h1>
      <div className="row muted">
        <span>{d.plan.carrier}</span>
        <span>{d.plan.plan_id_ext ?? "—"}</span>
        <span><b>{d.plan.plan_year}</b></span>
        <span>{d.plan.org_type ?? ""}</span>
        {d.plan.snp !== "NONE" && <span className="badge conflict">{d.plan.snp}</span>}
        <span>{d.service_areas.map((a) => `${a.county}, ${a.state}`).join(" · ")}</span>
      </div>
      <div className="notice">
        Strict Evidence Mode {d.strict_evidence_mode ? "ON" : "OFF"} — only reviewer-verified
        values are shown. A benefit missing below is <b>not</b> $0; it is unverified or absent
        from the documents on file.
      </div>

      {groups.map((g) => (
        <section key={g.cat}>
          <h2>{g.cat}</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Benefit</th>
                <th style={{ width: "18%" }}>Value</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.label_en}
                    <div className="muted" style={{ fontSize: 12 }}>{b.label_ko}</div>
                  </td>
                  <td>
                    {renderValue(b)}{" "}
                    <span className={`badge ${b.verification_status}`}>
                      {b.verification_status}
                    </span>
                    {b.limits && <div className="muted" style={{ fontSize: 12 }}>{b.limits}</div>}
                    {b.is_conditional && (
                      <div className="badge conflict" style={{ marginTop: 4 }}>
                        conditional: {b.conditions ?? "see document"}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="muted" style={{ fontSize: 12 }}>
                      page {b.page_number}{b.section ? ` · ${b.section}` : ""}
                    </div>
                    <div className="src">{b.source_text}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <h2>Ask this plan</h2>
      <AskPlan planId={d.plan.id} planYear={d.plan.plan_year} />
    </>
  );
}
