"use client";

import { useSettings } from "@/stores/settings";
import { useExamConfig } from "@/lib/exam-definitions";
import { languageInfo } from "@/lib/languages";
import type { ExamType } from "@/types";

export function ExamSwitcher() {
  const activeExamType = useSettings((s) => s.activeExamType);
  const language = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  const examConfig = useExamConfig();

  const examTypes = languageInfo(language).examTypes as ExamType[];

  return (
    <div className="border-t border-line px-3 py-3">
      <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        Exam Program
      </p>
      <select
        value={activeExamType}
        onChange={(e) => set({ activeExamType: e.target.value as ExamType })}
        className="w-full rounded-lg border border-line bg-sunken px-2.5 py-1.5 text-xs font-medium text-ink outline-none cursor-pointer"
        aria-label="Select exam type"
      >
        {examTypes.map((et) => (
          <option key={et} value={et}>
            {examConfig.displayNames[et] || et}
          </option>
        ))}
      </select>
    </div>
  );
}
