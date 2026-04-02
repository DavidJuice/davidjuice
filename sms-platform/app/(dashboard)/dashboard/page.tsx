"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  totalCampaigns: number;
  totalContacts: number;
  totalSent: number;
  totalDelivered: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    sentCount: number;
    totalContacts: number;
    createdAt: string;
  }>;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function load() {
      const [campaignsRes, contactsRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/contacts"),
      ]);
      const { campaigns } = await campaignsRes.json();
      const { total: totalContacts } = await contactsRes.json();

      const totalSent = campaigns.reduce(
        (sum: number, c: { sentCount: number }) => sum + c.sentCount,
        0
      );
      const totalDelivered = campaigns.reduce(
        (sum: number, c: { deliveredCount: number }) => sum + c.deliveredCount,
        0
      );

      setStats({
        totalCampaigns: campaigns.length,
        totalContacts,
        totalSent,
        totalDelivered,
        recentCampaigns: campaigns.slice(0, 5),
      });
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Welcome back</p>
        </div>
        <Link
          href="/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Campaigns", value: stats?.totalCampaigns ?? "—", icon: "📤" },
          { label: "Contacts", value: stats?.totalContacts ?? "—", icon: "👥" },
          { label: "Messages Sent", value: stats?.totalSent?.toLocaleString() ?? "—", icon: "✉️" },
          {
            label: "Delivered",
            value: stats
              ? stats.totalSent > 0
                ? `${Math.round((stats.totalDelivered / stats.totalSent) * 100)}%`
                : "—"
              : "—",
            icon: "✅",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Campaigns</h3>
          <Link href="/campaigns" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {stats?.recentCampaigns.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No campaigns yet.{" "}
              <Link href="/campaigns/new" className="text-blue-600 hover:underline">
                Create your first campaign
              </Link>
            </div>
          )}
          {stats?.recentCampaigns.map((c) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {c.sentCount}/{c.totalContacts} sent
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    statusColors[c.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
