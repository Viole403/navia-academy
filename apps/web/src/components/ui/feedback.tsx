"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="mb-4 text-ink-faint">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-faint max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex items-center justify-center py-16", className)} role="status" aria-label={t("common.loading")}>
      <Loader2 className="h-6 w-6 animate-spin text-ink-faint" />
    </div>
  );
}
