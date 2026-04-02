"use client";

import { useEffect, useState } from "react";

interface BlacklistEntry {
  id: string;
  phone: string;
  reason?: string;
  createdAt: string;
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/blacklist");
    const { entries } = await res.json();
    setEntries(entries ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!phone) return;
    await fetch("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, reason }),
    });
    setPhone(""); setReason(""); setAdding(false);
    load();
  }

  async function handleRemove(ph: string) {
    if (!confirm(`Remove ${ph} from the opt-out list? They may receive messages again.`)) return;
    await fetch("/api/blacklist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: ph }),
    });
    load();
  }

  const stopReplies = entries.filter((e) => e.reason === "STOP_REPLY");

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Opt-out List</h2>
        <button
          onClick={() => setAdding((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add manually
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Numbers here will never receive messages from any campaign. STOP replies are automatically added.
      </p>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Add to opt-out list</h3>
          <div className="flex gap-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+12065551234"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reason (optional)"
            />
            <button
              onClick={handleAdd}
              disabled={!phone}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
          <div className="text-sm text-gray-500">Total opted out</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-2xl font-bold text-red-600">{stopReplies.length}</div>
          <div className="text-sm text-gray-500">STOP replies (auto)</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Opt-outs</h3>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No opt-outs yet. STOP replies will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Phone</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Reason</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{e.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.reason === "STOP_REPLY"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {e.reason ?? "MANUAL"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(e.phone)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
        <p className="font-medium">TCPA & WA Compliance</p>
        <p className="mt-1">
          Under US law (TCPA) and Washington state law (RCW 80.36.400), replying STOP must immediately
          stop all further messages. This list is checked before every single message dispatch —
          no message will be sent to any number on this list, regardless of campaign settings.
        </p>
      </div>
    </div>
  );
}
