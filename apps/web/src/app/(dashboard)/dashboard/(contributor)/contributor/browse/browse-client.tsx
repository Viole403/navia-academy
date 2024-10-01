"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Input, Select } from "@/components/ui";
import { Search } from "lucide-react";
import { loadBundle } from "@/lib/data-client";
import { useTranslation } from "@/i18n/locale-context";

export interface Dataset {
  key: string;
  label: string;
  bundle: string;
}

const PAGE_SIZE = 50;
const EMPTY_ITEMS: unknown[] = [];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export default function BrowseClient({
  datasets,
  initial,
}: {
  datasets: Dataset[];
  initial: Record<string, unknown[]>;
}) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(datasets[0].key);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<Record<string, unknown[]>>(initial);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const dataset = datasets.find((d) => d.key === current) ?? datasets[0];

  useEffect(() => {
    if (loaded[dataset.key] !== undefined) return;
    const id = ++seq.current;
    let alive = true;
    queueMicrotask(() => {
      if (!alive || seq.current !== id) return;
      setBusy(true);
      loadBundle<unknown[]>(dataset.bundle)
        .then((data) => {
          if (seq.current === id) setLoaded((prev) => ({ ...prev, [dataset.key]: data }));
        })
        .catch(() => {
          if (seq.current === id) setLoaded((prev) => ({ ...prev, [dataset.key]: [] }));
        })
        .finally(() => {
          if (seq.current === id) setBusy(false);
        });
    });
    return () => {
      alive = false;
    };
  }, [dataset.key, dataset.bundle, loaded]);

  const items = loaded[dataset.key] ?? EMPTY_ITEMS;

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) => {
      if (!isObj(item)) return false;
      const fields = [
        item.id,
        item.text,
        item.hanzi,
        item.pinyin,
        item.romanization,
        item.kanji,
        item.translation,
        item.char,
      ]
        .filter(Boolean)
        .map((f) => String(f).toLowerCase());
      return fields.some((f) => f.includes(q));
    });
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const primary = useCallback(
    (o: Record<string, unknown>) =>
      String(
        dataset.key.startsWith("zh")
          ? o.hanzi ?? o.text ?? o.char ?? o.kanji ?? "-"
          : dataset.key === "ja"
            ? o.kanji ?? o.text ?? o.char ?? "-"
            : o.text ?? o.char ?? "-",
      ),
    [dataset.key],
  );

  const reading = useCallback(
    (o: Record<string, unknown>) =>
      String(o.pinyin ?? o.romanization ?? o.hiragana ?? o.katakana ?? o.pronunciation ?? "-"),
    [],
  );

  const cols = useMemo(() => {
    const idCol = {
      label: t("contrib.browse.colId"),
      value: (o: Record<string, unknown>) => String(o.id ?? "-"),
      mono: true,
    };
    const translationCol = {
      label: t("contrib.browse.colTranslation"),
      value: (o: Record<string, unknown>) => String(o.translation ?? "-"),
      mono: false,
    };
    if (dataset.key.startsWith("zh")) {
      return [
        idCol,
        { label: t("contrib.browse.colHanzi"), value: primary, mono: false },
        { label: t("contrib.browse.colPinyin"), value: reading, mono: false },
        translationCol,
      ];
    }
    if (dataset.key === "ja") {
      return [
        idCol,
        { label: t("contrib.browse.colKanji"), value: primary, mono: false },
        { label: t("contrib.browse.colReading"), value: reading, mono: false },
        translationCol,
      ];
    }
    return [
      idCol,
      { label: t("contrib.browse.colWord"), value: primary, mono: false },
      { label: t("contrib.browse.colPronunciation"), value: reading, mono: false },
      translationCol,
    ];
  }, [dataset.key, t, primary, reading]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">{t("contrib.browse.title")}</h1>
        <p className="text-sm text-ink-soft">{t("contrib.browse.subtitle")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={current} onChange={(e) => setCurrent(e.target.value)}>
          {datasets.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t("contrib.browse.search")}
            className="pl-8"
          />
        </div>
        <Badge tone="neutral">{t("contrib.browse.shown", { n: String(filtered.length) })}</Badge>
      </div>

      {busy ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-hover" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-ink-soft">
          {t("contrib.browse.empty")}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sunken text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                  {cols.map((c) => (
                    <th key={c.label} className="px-4 py-3">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {slice.map((item, i) => {
                  const o = isObj(item) ? item : {};
                  return (
                    <tr key={`${dataset.key}-${safePage}-${i}`} className="hover:bg-sunken/50">
                      {cols.map((c) => (
                        <td
                          key={c.label}
                          className={c.mono ? "px-4 py-2 font-mono text-xs text-ink-faint" : "px-4 py-2 text-ink"}
                        >
                          {c.value(o)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                {t("contrib.browse.prev")}
              </Button>
              <span className="text-sm text-ink-soft">
                {t("contrib.browse.page", { current: String(safePage), total: String(totalPages) })}
              </span>
              <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                {t("contrib.browse.next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}