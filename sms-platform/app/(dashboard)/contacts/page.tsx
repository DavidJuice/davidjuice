"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description?: string;
  _count: { members: number };
  createdAt: string;
}

export default function ContactsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadGroups() {
    const res = await fetch("/api/contacts/groups");
    const { groups } = await res.json();
    setGroups(groups ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? Contacts will not be deleted.")) return;
    await fetch("/api/contacts/groups", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadGroups();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
        <Link
          href="/contacts/upload"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Upload Contacts
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Contact Groups</h3>
          <p className="text-sm text-gray-400 mt-0.5">Each Excel upload creates a group</p>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p>No contact groups yet.</p>
            <Link href="/contacts/upload" className="text-blue-600 hover:underline text-sm mt-2 block">
              Upload your first list →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g._count.members} contacts · {new Date(g.createdAt).toLocaleDateString()}
                  </p>
                  {g.description && (
                    <p className="text-xs text-gray-400">{g.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/campaigns/new?group=${g.id}`}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                  >
                    Send Campaign
                  </Link>
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
