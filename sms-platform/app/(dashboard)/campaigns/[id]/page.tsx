"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  status: string;
  message?: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  totalContacts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledAt?: string;
  includeOptOut: boolean;
  phoneNumber: { number: string; friendlyName?: string };
  contactGroup?: { name: string };
  messages: Array<{
    id: string;
    phone: string;
    status: string;
    sentAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    errorMessage?: string;
  }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  QUEUED: "bg-blue-50 text-blue-500",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  UNDELIVERED: "bg-orange-100 text-orange-700",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [progress, setProgress] = useState({ sent: 0, delivered: 0, failed: 0, total: 0, status: "" });
  const [stopping, setStopping] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then(({ campaign }) => {
        setCampaign(campaign);
        setProgress({
          sent: campaign.sentCount,
          delivered: campaign.deliveredCount,
          failed: campaign.failedCount,
          total: campaign.totalContacts,
          status: campaign.status,
        });

        // Open SSE stream if actively sending
        if (campaign.status === "SENDING" || campaign.status === "QUEUED") {
          startSSE();
        }
      });

    return () => sseRef.current?.close();
  }, [id]);

  function startSSE() {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`/api/campaigns/${id}/progress`);
    sseRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data);
      if (["COMPLETED", "FAILED", "PAUSED", "CANCELLED"].includes(data.status)) {
        es.close();
        // Refresh campaign data
        fetch(`/api/campaigns/${id}`)
          .then((r) => r.json())
          .then(({ campaign }) => setCampaign(campaign));
      }
    };
  }

  async function handleStop() {
    setStopping(true);
    await fetch(`/api/campaigns/${id}/stop`, { method: "POST" });
    setStopping(false);
    sseRef.current?.close();
    setProgress((p) => ({ ...p, status: "PAUSED" }));
    setCampaign((c) => c ? { ...c, status: "PAUSED" } : c);
  }

  async function handleResend() {
    await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
    startSSE();
    setCampaign((c) => c ? { ...c, status: "QUEUED" } : c);
    setProgress((p) => ({ ...p, status: "QUEUED" }));
  }

  async function handleRetry() {
    await fetch(`/api/campaigns/${id}/retry`, { method: "POST" });
    startSSE();
    setCampaign((c) => c ? { ...c, status: "QUEUED" } : c);
    setProgress((p) => ({ ...p, status: "QUEUED" }));
  }

  if (!campaign) {
    return <div className="text-center py-12 text-gray-400">Loading…</div>;
  }

  const pct = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0;
  const deliveryRate = progress.sent > 0 ? Math.round((progress.delivered / progress.sent) * 100) : 0;
  const isSending = progress.status === "SENDING" || progress.status === "QUEUED";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/campaigns" className="hover:text-blue-600">Campaigns</Link>
        <span>/</span>
        <span className="text-gray-700">{campaign.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
          <p className="text-sm text-gray-400 mt-1">
            {campaign.contactGroup?.name} · From {campaign.phoneNumber.friendlyName ?? campaign.phoneNumber.number}
          </p>
        </div>
        <div className="flex gap-2">
          {isSending && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {stopping ? "Stopping…" : "Stop"}
            </button>
          )}
          {progress.status === "PAUSED" && (
            <button
              onClick={handleResend}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Resume
            </button>
          )}
          {progress.status === "COMPLETED" && progress.failed > 0 && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Retry Failed ({progress.failed})
            </button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Send Progress</h3>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            progress.status === "COMPLETED" ? "bg-green-100 text-green-700" :
            progress.status === "SENDING" ? "bg-blue-100 text-blue-700 animate-pulse" :
            progress.status === "FAILED" ? "bg-red-100 text-red-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {progress.status}
          </span>
        </div>

        <div className="h-3 bg-gray-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-3 bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{pct}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{progress.sent}</div>
            <div className="text-xs text-gray-500">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{progress.delivered}</div>
            <div className="text-xs text-gray-500">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-500">{progress.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
        </div>

        {progress.status === "COMPLETED" && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
            Delivery rate: <strong>{deliveryRate}%</strong> ·{" "}
            Total contacts: <strong>{progress.total}</strong>
          </div>
        )}
      </div>

      {/* Message Records */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Message Records</h3>
          <p className="text-xs text-gray-400 mt-0.5">Showing first 100 records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Sent at</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Delivered at</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {campaign.messages.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700 font-mono text-xs">{m.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[m.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.sentAt ? new Date(m.sentAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.deliveredAt ? new Date(m.deliveredAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-500">{m.errorMessage ?? ""}</td>
                </tr>
              ))}
              {campaign.messages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-400 text-sm">
                    No records yet. Start the campaign to see messages here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
