"use client";

import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  body: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/templates");
    const { templates } = await res.json();
    setTemplates(templates ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!name || !body) return;
    if (editing) {
      await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing, name, body }),
      });
    } else {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body }),
      });
    }
    setName(""); setBody(""); setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function startEdit(t: Template) {
    setEditing(t.id);
    setName(t.name);
    setBody(t.body);
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Message Templates</h2>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {editing ? "Edit Template" : "New Template"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Spring Promotion"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message body{" "}
              <span className="font-normal text-gray-400">— use &#123;name&#125; for personalization</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Hi {name}, we have a special offer…"
            />
            <p className="text-xs text-gray-400 mt-1">{body.length} chars</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!name || !body}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {editing ? "Save Changes" : "Save Template"}
            </button>
            {editing && (
              <button
                onClick={() => { setEditing(null); setName(""); setBody(""); }}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Saved Templates</h3>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No templates yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {templates.map((t) => (
              <div key={t.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated {new Date(t.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
