"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Answer = {
  answer: string;
  refused: boolean;
  route: string;
  provider: string;
  citations: {
    document_id: string; page_number: number | null;
    section: string | null; quoted_text: string;
  }[];
};

const EXAMPLES = [
  "Does dental cover implants?",
  "Does the OTC benefit roll over?",
  "Are transportation trips one-way or round trip?",
  "전문의 진료비가 얼마예요?",
];

export default function AskPlan({ planId, planYear }: { planId: string; planYear: number }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    setBusy(true);
    setA(null);
    try {
      setA(await api<Answer>("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // plan_year is always sent explicitly. The API refuses to infer one.
        body: JSON.stringify({ question, plan_id: planId, plan_year: planYear }),
      }));
    } catch (e) {
      setA({ answer: String(e), refused: true, route: "error", provider: "-", citations: [] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}
        className="row"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask about this plan (${planYear})…`}
          style={{ flex: 1, minWidth: 240 }}
        />
        <button className="primary" disabled={busy}>{busy ? "…" : "Ask"}</button>
      </form>
      <div className="row muted" style={{ fontSize: 12, marginTop: 8 }}>
        {EXAMPLES.map((x) => (
          <button key={x} onClick={() => { setQ(x); ask(x); }}>{x}</button>
        ))}
      </div>

      {a && (
        <div style={{ marginTop: 16 }}>
          <div className="row">
            <span className={`badge ${a.refused ? "conflict" : "verified"}`}>
              {a.refused ? "unverified" : a.route}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>{a.provider}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{a.answer}</p>
          {a.citations.map((c, i) => (
            <div key={i}>
              <div className="muted" style={{ fontSize: 12 }}>
                page {c.page_number}{c.section ? ` · ${c.section}` : ""}
              </div>
              <div className="src">{c.quoted_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
