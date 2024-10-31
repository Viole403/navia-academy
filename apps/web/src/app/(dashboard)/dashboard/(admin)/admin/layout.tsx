"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/users", label: "Users" },
  { href: "/dashboard/admin/content", label: "Content Review" },
  { href: "/dashboard/admin/contributors", label: "Contributors" },
  { href: "/dashboard/admin/contributors/applications", label: "Applications" },
  { href: "/dashboard/admin/sponsors", label: "Sponsors" },
  { href: "/dashboard/admin/support", label: "Support" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">403 — Forbidden</h1>
        <p className="text-ink-soft">You do not have permission to access this area.</p>
        <button onClick={() => router.push("/")} className="text-sm text-accent hover:underline cursor-pointer">
          Go home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <nav className="flex flex-wrap gap-2 border-b border-line pb-3">
        {NAV.map((n) => {
          const active = n.href === "/dashboard/admin" ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-hover hover:text-ink"
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}