"use client";

import { useEffect, useState } from "react";

interface InboundMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  phoneNumber?: { number: string; friendlyName?: string };
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/inbox");
    const data = await res.json();
    setMessages(data.messages ?? []);
    setUnreadCount(data.unreadCount ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isRead: true }),
    });
    setMessages((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, isRead: true } : m))
    );
    setUnreadCount((n) => Math.max(0, n - 1));
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inbox</h2>
        {unreadCount > 0 && (
          <span className="bg-blue-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-2xl mb-2">📥</p>
            <p>No replies yet. When contacts reply to your messages, they&apos;ll appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`px-6 py-4 hover:bg-gray-50 transition-colors ${!m.isRead ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 font-mono">{m.from}</span>
                      {!m.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <span className="text-xs text-gray-400">
                        → {m.phoneNumber?.friendlyName ?? m.to}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{m.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!m.isRead && (
                    <button
                      onClick={() => markRead(m.id)}
                      className="ml-4 text-xs text-blue-600 hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
