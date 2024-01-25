"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "@/i18n/locale-context";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          ←
        </Link>
      </div>
      <div className="mt-6 border-b border-line pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-faint">Navia</p>
        <h1 className="font-display mt-2 text-display-lg">{title}</h1>
        <p className="mt-2 text-sm text-ink-faint">
          {t("legal.updated")} {updated}
        </p>
      </div>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          ← Navia
        </Link>
      </div>
    </main>
  );
}