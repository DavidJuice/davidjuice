"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  totalContacts: number;
  createdAt: string;
  scheduledAt?: string;
  phoneNumber: { number: string; friendlyName?: string };
  contactGroup?: { name: string };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENDING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  PAUSED: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  QUEUED: "bg-blue-50 text-blue-600",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then(({ campaigns }) => {
        setCampaigns(campaigns ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
        <Link
          href="/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p>No campaigns yet.</p>
            <Link href="/campaigns/new" className="text-blue-600 hover:underline text-sm mt-2 block">
              Create your first campaign →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Campaign</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Progress</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">From</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/campaigns/${c.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                      {c.name}
                    </Link>
                    {c.contactGroup && (
                      <p className="text-xs text-gray-400 mt-0.5">{c.contactGroup.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700">
                      {c.sentCount}/{c.totalContacts}
                    </div>
                    {c.totalContacts > 0 && (
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full w-24">
                        <div
                          className="h-1.5 bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (c.sentCount / c.totalContacts) * 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {c.phoneNumber.friendlyName ?? c.phoneNumber.number}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
