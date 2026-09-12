"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function ReviewRow({
  factId,
  current,
}: {
  factId: string;
  current: number | null;
}) {
  const [state, setState] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current === null ? "" : String(current));

  async function send(action: "approve" | "reject" | "edit") {
    setState("saving…");
    try {
      await api(`/facts/${factId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          value_numeric: action === "edit" && value !== "" ? Number(value) : null,
        }),
      });
      setState(action === "approve" ? "verified" : action);
    } catch (e) {
      setState(String(e));
    }
  }

  if (state === "verified" || state === "reject" || state === "edit") {
    return <span className="badge verified">{state}</span>;
  }

  return (
    <div>
      <div className="row">
        <button className="primary" onClick={() => send("approve")}>Approve</button>
        <button onClick={() => setEditing(!editing)}>Edit</button>
        <button onClick={() => send("reject")}>Reject</button>
      </div>
      {editing && (
        <div style={{ marginTop: 6 }}>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" />
          <button style={{ marginTop: 6 }} onClick={() => send("edit")}>
            Save correction
          </button>
        </div>
      )}
      {state && <div className="muted" style={{ fontSize: 12 }}>{state}</div>}
    </div>
  );
}
