"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PreviewContact {
  phone: string;
  name: string;
  message?: string;
  language?: string;
}

interface PreviewData {
  preview: PreviewContact[];
  total: number;
  hasCustomMessages: boolean;
  errors: string[];
}

export default function UploadContactsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [groupName, setGroupName] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function handleFile(f: File) {
    setFile(f);
    setGroupName(f.name.replace(/\.[^.]+$/, ""));
    setPreview(null);
    setError("");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", f);
    formData.append("confirm", "false");

    const res = await fetch("/api/contacts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to parse file");
      return;
    }
    setPreview(data);
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("groupName", groupName);
    formData.append("confirm", "true");

    const res = await fetch("/api/contacts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }

    router.push(`/contacts?imported=${data.imported}`);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Contacts</h2>
      <p className="text-sm text-gray-500 mb-6">
        Upload an Excel (.xlsx) or CSV file. Required columns: <strong>phone</strong>, <strong>name</strong>.
        Optional: <strong>message</strong> (for per-contact messages), <strong>language</strong>.
        Korean columns are also supported: <strong>전화번호</strong>, <strong>이름</strong>, <strong>메시지</strong>.
      </p>

      {/* Download Template */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800 flex items-start gap-3">
        <span className="text-lg">📄</span>
        <div>
          <p className="font-medium">Excel template format</p>
          <p className="mt-1 text-blue-700">
            Columns: <code className="bg-blue-100 px-1 rounded">phone</code>{" "}
            <code className="bg-blue-100 px-1 rounded">name</code>{" "}
            <code className="bg-blue-100 px-1 rounded">message (optional)</code>{" "}
            <code className="bg-blue-100 px-1 rounded">language (optional)</code>
          </p>
          <p className="mt-1 text-blue-600 text-xs">
            Phone numbers can be US (+1), Korean (010-XXXX-XXXX), or E.164 format.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className="text-3xl mb-3">📂</div>
        <p className="text-sm font-medium text-gray-700">
          {file ? file.name : "Drop your Excel or CSV file here"}
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse · .xlsx, .xls, .csv</p>
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-4 text-center text-sm text-gray-400">Parsing file…</div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-900">Preview</p>
              <p className="text-sm text-gray-500">
                Found <strong>{preview.total}</strong> contacts.
                {preview.hasCustomMessages && (
                  <span className="ml-1 text-blue-600">Each contact has an individual message.</span>
                )}
              </p>
            </div>
          </div>

          {preview.errors.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <p className="font-medium">Parse warnings ({preview.errors.length})</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                {preview.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group name
            </label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Phone</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Name</th>
                  {preview.hasCustomMessages && (
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Message</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.preview.map((c, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{c.phone}</td>
                    <td className="px-4 py-2 text-gray-900">{c.name}</td>
                    {preview.hasCustomMessages && (
                      <td className="px-4 py-2 text-gray-500 text-xs truncate max-w-xs">{c.message ?? "—"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.total > 10 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                Showing first 10 of {preview.total} contacts
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Importing…" : `Import ${preview.total} Contacts`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
