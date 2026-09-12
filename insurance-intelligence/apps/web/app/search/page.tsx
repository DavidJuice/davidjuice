"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Result = {
  query_plan: {
    plan_year: number; counties: string[];
    filters: { benefit_code: string; op: string; value: number; frequency: string | null }[];
    order_by: string | null; language: string;
  };
  results: {
    id: string; plan_name: string; plan_id_ext: string | null; carrier: string;
    plan_year: number;
    matched_values: {
      fact_id: string; benefit_code: string; value_numeric: number | null;
      frequency: string; verification_status: string; page_number: number | null;
    }[];
  }[];
};

const EXAMPLES = [
  "Show 2026 Snohomish plans with $0 PCP and MOOP below $5,000",
  "Which 2026 plans have at least $2,000 in dental and at least $100 per month in OTC?",
  "치과 $2,000 이상인 2026 플랜 보여줘",
  "Which 2026 plans have the lowest MOOP?",
];

export default function Search() {
  const [q, setQ] = useState("");
  const [year, setYear] = useState(2026);
  const [r, setR] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(question: string) {
    setErr(null); setR(null);
    try {
      setR(await api<Result>("/search/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, plan_year: year, strict: true }),
      }));
    } catch (e) { setErr(String(e)); }
  }

  return (
    <>
      <h1>Search plans</h1>
      <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="row">
        <input value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Ask about plans or benefits…" style={{ flex: 1, minWidth: 260 }} />
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                style={{ width: 110 }}>
          <option value={2026}>2026</option>
          <option value={2027}>2027</option>
        </select>
        <button className="primary">Search</button>
      </form>
      <p className="muted" style={{ fontSize: 12 }}>
        The plan year selector is the fallback only. A year written in the question always wins,
        and a search with no year at all is refused rather than guessed.
      </p>
      <div className="row" style={{ fontSize: 12 }}>
        {EXAMPLES.map((x) => <button key={x} onClick={() => { setQ(x); run(x); }}>{x}</button>)}
      </div>

      {err && <div className="notice">{err}</div>}
      {r && (
        <>
          <h2>Interpreted as</h2>
          <div className="src">
            plan_year = {r.query_plan.plan_year}
            {r.query_plan.counties.length ? `\ncounty in ${r.query_plan.counties.join(", ")}` : ""}
            {r.query_plan.filters.map(
              (f) => `\n${f.benefit_code} ${f.op} ${f.value}${f.frequency ? ` (${f.frequency})` : ""}`
            )}
            {r.query_plan.order_by ? `\norder by ${r.query_plan.order_by}` : ""}
          </div>
          <h2>{r.results.length} matching plans</h2>
          <table>
            <thead>
              <tr><th>Plan</th><th>Carrier</th><th>Plan ID</th><th>Matched values</th></tr>
            </thead>
            <tbody>
              {r.results.map((p) => (
                <tr key={p.id}>
                  <td><a href={`/plans/${p.id}`}>{p.plan_name}</a></td>
                  <td>{p.carrier}</td>
                  <td className="muted">{p.plan_id_ext ?? "—"}</td>
                  <td>
                    {p.matched_values.map((m) => (
                      <div key={m.fact_id}>
                        {m.benefit_code}: {m.value_numeric}
                        {m.frequency !== "not_applicable" && ` / ${m.frequency.replace("per_", "")}`}{" "}
                        <span className={`badge ${m.verification_status}`}>
                          p.{m.page_number}
                        </span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
