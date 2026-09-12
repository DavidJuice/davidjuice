"use client";

import { useState } from "react";
import { userId } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Upload() {
  const [status, setStatus] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("Uploading…");
    const res = await fetch(`${BASE}/documents/upload`, {
      method: "POST",
      body: form,
      headers: { "X-User-Id": userId() },
    });
    if (!res.ok) return setStatus(`Failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    setDocId(data.document_id);
    setStatus(
      data.duplicate
        ? "This exact file is already in your library (matched by checksum). Nothing reprocessed."
        : "Uploaded. Parsing and extraction run in the background."
    );
  }

  return (
    <>
      <h1>Upload a carrier document</h1>
      <p className="muted">PDF only in the MVP. The original file is stored unmodified.</p>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <input type="file" name="file" accept="application/pdf" required />
        <p><button className="primary" type="submit">Upload</button></p>
      </form>
      {status && <div className="notice">{status}</div>}
      {docId && (
        <p>
          <a href={`/review?document=${docId}`}>Go to the review queue for this document →</a>
        </p>
      )}
    </>
  );
}
