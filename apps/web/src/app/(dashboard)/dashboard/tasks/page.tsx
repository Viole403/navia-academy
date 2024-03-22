"use client";

import { useMounted } from "@/lib/use-mounted";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, ClipboardList, Plus, Sparkles, Trash2 } from "lucide-react";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import { todayISO } from "@/lib/utils";
import { generateStudyTasks } from "@/lib/task-planner";
import { languageInfo } from "@/lib/languages";
import { SKILL_LABELS, type Skill, type StudyTask } from "@/types";
import { Badge, Button, Card, EmptyState, Input, Modal, SectionHeader, Select, Tabs, TabPanel, Textarea } from "@/components/ui";
import { useTranslation } from "@/i18n/locale-context";

export default function TasksPage() {
  const { t, locale } = useTranslation();
  const progress = useProgress();
  const settings = useSettings();
  const [tab, setTab] = useState("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const mounted = useMounted();

  useEffect(() => {
    if (genCount === 0) return;
    const id = setTimeout(() => setGenCount(0), 3000);
    return () => clearTimeout(id);
  }, [genCount]);

  const lang = settings.language;
  const langTasks = useMemo(
    () => progress.tasks.filter((t) => (t.language ?? lang) === lang),
    [progress.tasks, lang],
  );

  function handleGenerate() {
    const tasks = generateStudyTasks({
      t,
      srs: progress.srs[lang] ?? {},
      attempts: progress.attempts,
      sessions: progress.sessions,
      dailyGoalMin: settings.dailyGoalMin,
      activeExam: languageInfo(lang).examTypes[0] ?? settings.activeExamType,
      language: lang,
      existing: progress.tasks,
      today: todayISO(),
    });
    tasks.forEach((task) => progress.addTask(task));
    setGenCount(tasks.length);
  }

  const today = todayISO();
  const enriched = useMemo(
    () =>
      langTasks.map((task) =>
        task.status === "pending" && task.dueDate < today ? { ...task, status: "overdue" as const } : task
      ),
    [langTasks, today]
  );

  const filtered = enriched
    .filter((task) => {
      if (tab === "pending") return task.status === "pending" || task.status === "in-progress";
      if (tab === "overdue") return task.status === "overdue";
      if (tab === "done") return task.status === "done";
      return true;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (!mounted) return null;

  return (
    <div className="animate-fade-up">
      <SectionHeader
        
        title={t("nav.tasks")}
        subtitle={t("tasks.subtitle")}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleGenerate}>
              <Sparkles className="h-4 w-4" /> {t("tasks.generatePlan")}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> {t("tasks.newTask")}
            </Button>
          </div>
        }
      />

      {genCount > 0 && (
        <p className="mb-4 rounded-[var(--radius)] border border-accent bg-accent-soft px-3 py-2 text-sm text-ink">
          {t("tasks.generated", { n: String(genCount) })}
        </p>
      )}

      <Tabs
        tabs={[
          { id: "pending", label: t("tasks.tabPending", { count: String(enriched.filter((task) => task.status === "pending" || task.status === "in-progress").length) }) },
          { id: "overdue", label: t("tasks.tabOverdue", { count: String(enriched.filter((task) => task.status === "overdue").length) }) },
          { id: "done", label: t("tasks.tabDone") },
          { id: "all", label: t("tasks.tabAll") },
        ]}
        active={tab}
        onChange={setTab}
        id="tasks-tabs"
        className="mb-5"
      />

      <TabPanel baseId="tasks-tabs" tabId={tab}>
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title={tab === "done" ? t("tasks.emptyDone") : t("tasks.emptyNothing")}
          description={tab === "overdue" ? t("tasks.emptyOverdue") : t("tasks.emptyDesc")}
          action={<Button variant="outline" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> {t("tasks.createTask")}</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((task) => (
            <Card key={task.id} className="flex items-center gap-3.5 p-4">
              <button
                onClick={() =>
                  progress.updateTask(task.id, {
                    status: task.status === "done" ? "pending" : "done",
                    completedAt: task.status === "done" ? undefined : new Date().toISOString(),
                  })
                }
                aria-label={task.status === "done" ? t("tasks.markPending") : t("tasks.markCompleted")}
                className="shrink-0 cursor-pointer"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                ) : (
                  <Circle className="h-6 w-6 text-ink-faint hover:text-accent" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={task.status === "done" ? "font-medium line-through text-ink-faint" : "font-medium"}>
                  {task.linkedRoute ? (
                    <Link href={task.linkedRoute} className="hover:text-accent hover:underline">{task.title}</Link>
                  ) : (
                    task.title
                  )}
                </p>
                <p className="truncate text-xs text-ink-faint">{task.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <Badge tone={task.status === "overdue" ? "danger" : "neutral"}>
                    {new Date(task.dueDate + "T12:00:00").toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
                  </Badge>
                  <Badge>{SKILL_LABELS[task.skill]}</Badge>
                  <Badge>{task.estimatedMin} min</Badge>
                  <Badge tone={task.priority === "high" ? "danger" : task.priority === "medium" ? "warn" : "neutral"}>
                    {task.priority === "high" ? t("tasks.priorityHigh") : task.priority === "medium" ? t("tasks.priorityMedium") : t("tasks.priorityLow")}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {task.status !== "done" && (
                  <Select
                    aria-label={t("tasks.rescheduleAria")}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const d = new Date();
                      d.setDate(d.getDate() + Number(e.target.value));
                      progress.updateTask(task.id, { dueDate: d.toISOString().slice(0, 10), status: "pending" });
                    }}
                    className="w-28 text-xs"
                  >
                    <option value="">{t("tasks.reschedule")}</option>
                    <option value="0">{t("tasks.today")}</option>
                    <option value="1">{t("tasks.tomorrow")}</option>
                    <option value="3">{t("tasks.in3Days")}</option>
                    <option value="7">{t("tasks.in1Week")}</option>
                  </Select>
                )}
                <button
                  onClick={() => progress.removeTask(task.id)}
                  aria-label={t("tasks.delete")}
                  className="rounded-lg p-2 text-ink-faint hover:bg-hover hover:text-danger cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      </TabPanel>

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(task) => progress.addTask({ ...task, language: lang })} />
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (t: StudyTask) => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState<Skill>("vocabulary");
  const [dueDate, setDueDate] = useState(todayISO());
  const [estimatedMin, setEstimatedMin] = useState("20");
  const [priority, setPriority] = useState<StudyTask["priority"]>("medium");

  return (
    <Modal open={open} onClose={onClose} title={t("tasks.newTask")}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({
            id: `task-${Date.now()}`,
            title,
            description,
            skill,
            type: "lesson",
            dueDate,
            estimatedMin: Number(estimatedMin),
            priority,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
          setTitle("");
          setDescription("");
          onClose();
        }}
      >
        <Input label={t("tasks.title")} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t("tasks.titlePlaceholder")} />
        <Textarea label={t("tasks.description")} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("tasks.descPlaceholder")} />
        <div className="grid grid-cols-2 gap-3">
          <Select label={t("tasks.skill")} value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
            {Object.entries(SKILL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label={t("tasks.date")} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          <Select label={t("tasks.duration")} value={estimatedMin} onChange={(e) => setEstimatedMin(e.target.value)}>
            <option value="10">{t("tasks.min10")}</option>
            <option value="20">{t("tasks.min20")}</option>
            <option value="30">{t("tasks.min30")}</option>
            <option value="60">{t("tasks.hour1")}</option>
          </Select>
          <Select label={t("tasks.priorityLabel")} value={priority} onChange={(e) => setPriority(e.target.value as StudyTask["priority"]) }>
            <option value="low">{t("tasks.priorityLow")}</option>
            <option value="medium">{t("tasks.priorityMedium")}</option>
            <option value="high">{t("tasks.priorityHigh")}</option>
          </Select>
        </div>
        <Button type="submit" className="w-full" disabled={!title.trim()}>{t("tasks.createTask")}</Button>
      </form>
    </Modal>
  );
}
