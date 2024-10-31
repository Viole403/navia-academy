"use client";

import { useMounted } from "@/lib/use-mounted";
import { useMemo, useState } from "react";
import { Download, ShieldAlert, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCurriculum } from "@/lib/curriculum";
import { useVocabulary } from "@/lib/vocabulary";
import { useCharacters } from "@/lib/characters";
import { useGrammar } from "@/lib/grammar";
import { useReadings } from "@/lib/readings";
import { useConversations } from "@/lib/conversations";
import { useAchievements } from "@/lib/achievements";
import { Badge, Button, Card, EmptyState, SectionHeader, StatCard, Tabs, TabPanel } from "@/components/ui";
import { useTranslation } from "@/i18n/locale-context";

type DatasetKey = "lessons" | "characters" | "grammar" | "readings" | "conversations" | "achievements" | "vocabulary";

export default function AdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { course: COURSE, levels: LEVELS, units: UNITS, lessons: LESSONS } = useCurriculum();
  const vocabulary = useVocabulary();
  const CHARACTERS = useCharacters();
  const GRAMMAR_POINTS = useGrammar();
  const READINGS = useReadings();
  const CONVERSATIONS = useConversations();
  const ACHIEVEMENTS = useAchievements();
  const [tab, setTab] = useState<DatasetKey>("lessons");
  const mounted = useMounted();

  const datasets = useMemo(
    () => ({
      lessons: { labelKey: "admin.dataset.lessons", data: LESSONS },
      characters: { labelKey: "admin.dataset.characters", data: CHARACTERS },
      grammar: { labelKey: "admin.dataset.grammar", data: GRAMMAR_POINTS },
      readings: { labelKey: "admin.dataset.readings", data: READINGS },
      conversations: { labelKey: "admin.dataset.conversations", data: CONVERSATIONS },
      achievements: { labelKey: "admin.dataset.achievements", data: ACHIEVEMENTS },
      vocabulary: { labelKey: "admin.dataset.vocabulary", data: vocabulary },
    }),
    [LESSONS, CHARACTERS, GRAMMAR_POINTS, READINGS, CONVERSATIONS, ACHIEVEMENTS, vocabulary],
  );

  const rows = useMemo(() => datasets[tab].data as unknown as Record<string, unknown>[], [datasets, tab]);

  if (!mounted) return null;

  if (user?.role !== "admin") {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-10 w-10" />}
        title={t("admin.restricted")}
        description={t("admin.restrictedDesc")}
      />
    );
  }

  function exportDataset() {
    const blob = new Blob([JSON.stringify(datasets[tab].data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `navia-${tab}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-up">
      <SectionHeader
        
        title={t("admin.title")}
        subtitle={t("admin.subtitle", { course: COURSE.title })}
        action={<Badge tone="danger">{t("admin.roleBadge")}</Badge>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("admin.statLevels")} value={LEVELS.length} />
        <StatCard label={t("admin.statUnits")} value={UNITS.length} />
        <StatCard label={t("admin.dataset.lessons")} value={LESSONS.length} />
        <StatCard label={t("admin.statWords")} value={vocabulary.length} />
      </div>

      <Tabs
        tabs={Object.entries(datasets).map(([id, d]) => ({ id, label: `${t(d.labelKey)} (${d.data.length})` }))}
        active={tab}
        onChange={(id) => setTab(id as DatasetKey)}
        id="admin-tabs"
        className="mb-4"
      />

      <TabPanel baseId="admin-tabs" tabId={tab}>
      <div className="mb-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={exportDataset}>
          <Download className="h-4 w-4" /> {t("admin.export")}
        </Button>
        <Button variant="outline" size="sm" disabled title={t("admin.importTitle")}>
          <Upload className="h-4 w-4" /> {t("admin.import")}
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-faint">
              <th className="px-4 py-2.5 font-medium">{t("admin.colId")}</th>
              <th className="px-4 py-2.5 font-medium">{t("admin.colTitle")}</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">{t("admin.colDetail")}</th>
              <th className="px-4 py-2.5 font-medium">{t("admin.colStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, i) => {
              const id = String(row.id ?? i);
              const title = String(row.title ?? row.hanzi ?? row.char ?? "—");
              const detail = String(row.subtitle ?? row.translation ?? row.meaning ?? row.pattern ?? row.description ?? "").slice(0, 60);
              return (
                <tr key={id} className="border-b border-line last:border-0 hover:bg-hover">
                  <td className="px-4 py-2 font-mono text-xs text-ink-faint">{id}</td>
                  <td className="hanzi px-4 py-2" lang="zh-CN">{title}</td>
                  <td className="hidden px-4 py-2 text-ink-soft sm:table-cell">{detail}</td>
                  <td className="px-4 py-2"><Badge tone="success">{t("admin.published")}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-ink-faint">{t("admin.footer")}</p>
      </TabPanel>
    </div>
  );
}
