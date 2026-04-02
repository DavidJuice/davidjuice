"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/campaigns", label: "Campaigns", icon: "📤" },
  { href: "/contacts", label: "Contacts", icon: "👥" },
  { href: "/inbox", label: "Inbox", icon: "📥" },
  { href: "/templates", label: "Templates", icon: "📝" },
  { href: "/phone-numbers", label: "Phone Numbers", icon: "📱" },
  { href: "/blacklist", label: "Opt-out List", icon: "🚫" },
  { href: "/team", label: "Team", icon: "👤" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 text-lg">DavidJuice SMS</h1>
          <p className="text-xs text-gray-400 mt-0.5">Bulk SMS Platform</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-1">
            <p className="text-xs font-medium text-gray-800 truncate">
              {session.user?.name ?? session.user?.email}
            </p>
            <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full mt-2 text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
