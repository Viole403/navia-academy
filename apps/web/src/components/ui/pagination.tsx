"use client";

import { useTranslation } from "@/i18n/locale-context";
import { Button } from "./button";

/**
 * Minimal pagination bar: ‹ Prev · Page n / m · Next ›.
 * Renders nothing when there is only one page (self-adaptive — callers don't
 * need to know the dataset size). Always `aria-`labelled for a11y.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav aria-label={t("common.pagination")} className="mt-6 flex items-center justify-center gap-3">
      <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onChange(page - 1)}>
        {t("common.prev")}
      </Button>
      <span className="text-sm text-ink-soft">
        {t("common.pageOf", { page: String(page), total: String(totalPages) })}
      </span>
      <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onChange(page + 1)}>
        {t("common.next")}
      </Button>
    </nav>
  );
}