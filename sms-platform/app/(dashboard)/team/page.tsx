"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Member {
  id: string;
  name?: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { campaigns: number };
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  async function load() {
    const res = await fetch("/api/team");
    const { members } = await res.json();
    setMembers(members ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleRoleChange(userId: string, role: string) {
    await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    load();
  }

  async function handleRemove(userId: string, email: string) {
    if (!confirm(`Remove ${email} from the team?`)) return;
    await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    load();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team</h2>
          <p className="text-sm text-gray-500 mt-1">Manage team members and roles</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          Only admins can manage team members and roles.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                    {(m.name ?? m.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name ?? m.email}</p>
                    {m.name && <p className="text-xs text-gray-400">{m.email}</p>}
                    <p className="text-xs text-gray-400">
                      {m._count.campaigns} campaigns · Joined {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && m.id !== session?.user?.id ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemove(m.id, m.email)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      m.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {m.role === "ADMIN" ? "Admin" : "Member"}
                      {m.id === session?.user?.id ? " (you)" : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
        <p className="font-medium">Adding team members</p>
        <p className="mt-1">
          Team members can sign up at <strong>/register</strong> using their work email. The first registered
          user is automatically made Admin. Admins can promote or demote any member here.
        </p>
      </div>
    </div>
  );
}
