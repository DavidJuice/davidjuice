"use client";

import { useEffect, useState } from "react";

interface PhoneNumber {
  id: string;
  number: string;
  friendlyName?: string;
  forwardingNumber?: string;
  isActive: boolean;
  createdAt: string;
  assignedTo?: { name?: string; email: string };
}

export default function PhoneNumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ number: "", twilioSid: "", friendlyName: "", forwardingNumber: "" });
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForwarding, setEditForwarding] = useState("");

  async function load() {
    const res = await fetch("/api/phone-numbers");
    const { numbers } = await res.json();
    setNumbers(numbers ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    setError("");
    if (!form.number || !form.twilioSid) {
      setError("Twilio number and SID are required");
      return;
    }
    const res = await fetch("/api/phone-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setAdding(false);
    setForm({ number: "", twilioSid: "", friendlyName: "", forwardingNumber: "" });
    load();
  }

  async function handleUpdateForwarding(id: string) {
    await fetch(`/api/phone-numbers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forwardingNumber: editForwarding }),
    });
    setEditId(null);
    load();
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Remove this phone number from the platform?")) return;
    await fetch(`/api/phone-numbers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Phone Numbers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Twilio numbers used to send and receive SMS
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Number
        </button>
      </div>

      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Register Twilio Number</h3>
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number (E.164) *</label>
                <input
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+12065551234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twilio SID *</label>
                <input
                  value={form.twilioSid}
                  onChange={(e) => setForm((f) => ({ ...f, twilioSid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Friendly name</label>
                <input
                  value={form.friendlyName}
                  onChange={(e) => setForm((f) => ({ ...f, friendlyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Marketing Line"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forward replies to
                  <span className="font-normal text-gray-400 ml-1">(optional)</span>
                </label>
                <input
                  value={form.forwardingNumber}
                  onChange={(e) => setForm((f) => ({ ...f, forwardingNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+12065559999"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Find your Twilio SID and phone number in the{" "}
              <strong>Twilio Console → Phone Numbers → Manage → Active numbers</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Add Number
              </button>
              <button
                onClick={() => { setAdding(false); setError(""); }}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : numbers.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-2xl mb-2">📱</p>
            <p>No phone numbers registered yet.</p>
            <p className="text-sm mt-1">Add a Twilio number to start sending campaigns.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {numbers.map((n) => (
              <div key={n.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 font-mono">{n.number}</p>
                      {n.friendlyName && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {n.friendlyName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {n.assignedTo
                        ? `Assigned to ${n.assignedTo.name ?? n.assignedTo.email}`
                        : "Unassigned"}{" "}
                      · Added {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                    {editId === n.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          value={editForwarding}
                          onChange={(e) => setEditForwarding(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="+1 forwarding number"
                        />
                        <button
                          onClick={() => handleUpdateForwarding(n.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        Replies forward to:{" "}
                        <span className="font-mono">{n.forwardingNumber ?? "not set"}</span>
                        <button
                          onClick={() => { setEditId(n.id); setEditForwarding(n.forwardingNumber ?? ""); }}
                          className="ml-2 text-blue-500 hover:underline"
                        >
                          edit
                        </button>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeactivate(n.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <p className="font-medium">Twilio webhook setup required</p>
        <p className="mt-1">
          In your Twilio Console, set each number&apos;s <strong>SMS Webhook URL</strong> to:
          <code className="ml-1 bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/webhooks/twilio
          </code>
        </p>
        <p className="mt-1">
          Set <strong>Status Callback URL</strong> to the same URL. Both use HTTP POST.
        </p>
      </div>
    </div>
  );
}
