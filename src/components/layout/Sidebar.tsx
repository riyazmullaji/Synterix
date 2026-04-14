"use client";

import { api, getAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/sessions", label: "Sessions" },
  { href: "/quality", label: "Quality" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/synonyms", label: "Synonyms" },
  { href: "/admin/rules", label: "Rules" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const authed = !!token;
    setIsAuthed(authed);

    if (!authed && pathname !== "/auth") {
      router.replace("/auth");
      return;
    }
    if (authed && pathname === "/auth") {
      router.replace("/sessions");
    }
  }, [pathname, router]);

  return (
    <aside
      className="fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col z-20"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Logo / brand */}
      <div className="px-5 py-4 border-b border-gray-200">
        <span className="text-base font-semibold tracking-tight text-gray-900">Synterix</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.filter(({ href }) => (isAuthed ? true : href === "/auth")).map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "block px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-gray-200 space-y-2">
        {isAuthed && (
          <button
            onClick={() => {
              api.auth.logout();
              setIsAuthed(false);
              router.replace("/auth");
            }}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Logout
          </button>
        )}
        <div className="text-xs text-gray-400">v0.1.0</div>
      </div>
    </aside>
  );
}
