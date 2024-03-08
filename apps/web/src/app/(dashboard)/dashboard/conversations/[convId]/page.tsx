"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, RotateCcw, Volume2 } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { useConversations, conversationById } from "@/lib/conversations";
import { useProgress } from "@/stores/progress";
import { showsTranslation, useSettings } from "@/stores/settings";
import { play } from "@/lib/audio";
import { useTranslation } from "@/i18n/locale-context";
import { locText, translationFor } from "@/lib/content-translation";
import { cn, shuffle } from "@/lib/utils";
import { Button, Card, EmptyState, PinyinText, SectionHeader } from "@/components/ui";

interface HistoryItem {
  speaker: "tutor" | "user";
  hanzi: string;
  pinyin: string;
  zhuyin?: string;
  translation: string;
  feedback?: string;
  natural?: boolean;
}

export default function ConversationPlayerPage() {
  const { convId } = useParams<{ convId: string }>();
  useConversations();
  const conv = conversationById(convId);
  const progress = useProgress();
  const settings = useSettings();
  const { t, locale } = useTranslation();
  // One entry per answered user turn: the index of the chosen option.
  const [picks, setPicks] = useState<number[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const mounted = useMounted();

  // Derive the visible transcript and the pending user turn from the picks.
  const { history, currentTurn, finished } = useMemo(() => {
    if (!conv) {
      return { history: [] as HistoryItem[], currentTurn: null, finished: false };
    }
    const items: HistoryItem[] = [];
    let userTurnsSeen = 0;
    for (const turn of conv.turns) {
      if (turn.speaker === "tutor") {
        items.push({ speaker: "tutor", hanzi: turn.hanzi ?? "", pinyin: turn.pinyin ?? "", zhuyin: turn.zhuyin, translation: turn.translation });
      } else {
        if (userTurnsSeen >= picks.length) {
          return { history: items, currentTurn: turn, finished: false };
        }
        const choice = turn.choices?.[picks[userTurnsSeen]];
        if (choice) {
          items.push({
            speaker: "user",
            hanzi: choice.hanzi ?? "",
            pinyin: choice.pinyin ?? "",
            zhuyin: choice.zhuyin,
            translation: choice.translation,
            feedback: choice.feedback,
            natural: choice.natural,
          });
        }
        userTurnsSeen += 1;
      }
    }
    return { history: items, currentTurn: null, finished: true };
  }, [conv, picks]);

  // Speak the newest tutor line when it appears.
  const lastTutorLine = history.filter((h) => h.speaker === "tutor").at(-1)?.hanzi;
  useEffect(() => {
    if (lastTutorLine && settings.autoplayAudio) play(lastTutorLine, { rate: settings.audioRate, onLoadingChange: setAudioLoading, onError: () => {} }, "zh-CN", settings.voiceGender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTutorLine]);

  const choiceOrder = useMemo(() => {
    if (!currentTurn?.choices) return [];
    return shuffle(currentTurn.choices.map((_, i) => i));
  }, [currentTurn]);

  if (!mounted) return null;

  if (!conv) {
    return (
      <EmptyState
        title="Conversation not found"
        action={<Link href="/dashboard/conversations"><Button>{t("common.back")}</Button></Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <Link href="/dashboard/conversations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Conversations
      </Link>
      <SectionHeader title={locText(conv, "title", locale)} subtitle={locText(conv, "context", locale)} />

      <div className="space-y-3" aria-live="polite">
        {history.map((item, i) => (
          <div key={i} className={cn("flex", item.speaker === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl border px-4 py-3",
                item.speaker === "user" ? "border-accent/40 bg-accent-soft" : "border-line bg-raised"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="hanzi text-lg" lang="zh-CN">{item.hanzi}</p>
                 <button
                   onClick={() => play(item.hanzi, { rate: settings.audioRate, onLoadingChange: setAudioLoading, onError: () => {} }, "zh-CN", settings.voiceGender)}
                   disabled={audioLoading}
                   className="rounded p-1 text-ink-faint hover:text-accent cursor-pointer disabled:opacity-50"
                   aria-label={t('audio.listen')}
                 >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {<PinyinText pinyin={item.pinyin} zhuyin={item.zhuyin} className="text-xs" />}
              {showsTranslation(settings.displayMode.mode) && <p className="mt-0.5 text-xs text-ink-faint">{translationFor(item, locale)}</p>}
              {item.feedback && (
                <p className={cn("mt-2 border-t border-line pt-2 text-xs", item.natural ? "text-success" : "text-warn")}>
                  {item.feedback}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentTurn?.choices && (
        <Card className="mt-5 p-5">
          <p className="text-sm font-medium">Your turn: choose the most natural response</p>
          <div className="mt-3 space-y-2">
            {choiceOrder.map((choiceIdx) => {
              const c = currentTurn.choices![choiceIdx];
              return (
                <button
                   key={choiceIdx}
                   onClick={() => {
                     progress.logStudy(1, "speaking", c.natural ? 6 : 2);
                     setPicks((p) => [...p, choiceIdx]);
                   }}
                   className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-left hover:border-accent hover:bg-hover cursor-pointer"
                 >
                   <span className="hanzi text-base" lang="zh-CN">{c.hanzi ?? ""}</span>
                   <PinyinText pinyin={c.pinyin ?? ""} zhuyin={c.zhuyin} className="block text-xs" />
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {finished && (
        <div className="mt-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-jade" aria-hidden />
          <p className="font-display mt-3 text-lg font-semibold">Conversation completed</p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setPicks([])}>
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
            <Link href="/dashboard/conversations"><Button>{t("conversation.newScenario")}</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
