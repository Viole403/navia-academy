"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard/contributor", label: "My Content" },
  { href: "/dashboard/contributor/browse", label: "Browse Existing" },
]

export default function ContributorLayout({
  children,
}: {
  children: ReactNode
}) {
  const { loading, isContributor } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isContributor) {
      router.replace("/")
    }
  }, [loading, isContributor, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!isContributor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          403 — Forbidden
        </h1>
        <p className="text-ink-soft">
          You do not have permission to access this area.
        </p>
        <button
          onClick={() => router.push("/")}
          className="cursor-pointer text-sm text-accent hover:underline"
        >
          Go home
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <nav className="flex flex-wrap gap-2 border-b border-line pb-3">
        {NAV.map((n) => {
          const active =
            n.href === "/dashboard/contributor"
              ? pathname === n.href
              : pathname.startsWith(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-soft hover:bg-hover hover:text-ink"
              )}
            >
              {n.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
