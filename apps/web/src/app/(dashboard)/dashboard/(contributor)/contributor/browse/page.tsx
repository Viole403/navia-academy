import { Suspense } from "react";
import { loadBundle } from "@/lib/data-client";
import BrowseClient, { type Dataset } from "./browse-client";

export const DATASETS: Dataset[] = [
  { key: "zh-hsk", label: "ZH · HSK", bundle: "zh/vocabulary/hsk/index" },
  { key: "zh-tocfl", label: "ZH · TOCFL", bundle: "zh/vocabulary/tocfl/index" },
  { key: "de", label: "DE", bundle: "de/vocabulary/index" },
  { key: "en", label: "EN", bundle: "en/vocabulary/index" },
  { key: "ja", label: "JA", bundle: "ja/vocabulary/index" },
];

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const first = DATASETS[0];
  const initial = await loadBundle<unknown[]>(first.bundle).catch(() => []);
  return (
    <Suspense fallback={null}>
      <BrowseClient datasets={DATASETS} initial={{ [first.key]: initial }} />
    </Suspense>
  );
}