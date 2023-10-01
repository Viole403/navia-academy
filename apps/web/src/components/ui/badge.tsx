"use client";

import type { ReactNode } from "react";
import type { ExamType, ExamMappings } from "@/types";
import { useExamConfig } from "@/lib/exam-definitions";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      tone: {
        neutral: "bg-sunken text-ink-soft border-line",
        accent: "bg-accent-soft text-accent border-transparent",
        success: "bg-sunken text-success border-line",
        warn: "bg-sunken text-warn border-line",
        danger: "bg-sunken text-danger border-line",
        gold: "bg-sunken text-gold border-line",
        info: "bg-sunken text-info border-line",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  children,
  tone = "neutral",
  className,
  style,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span style={style} className={cn(badgeVariants({ tone }), className)}>
      {children}
    </span>
  );
}

export function HskBadge({ hsk }: { hsk: number }) {
  return <Badge tone="accent">HSK {hsk === 7 ? "7-9" : hsk}</Badge>;
}

interface ExamBadgeProps {
  examMappings?: ExamMappings;
  currentExam?: ExamType;
  hsk?: number;
}

export function ExamBadge({ examMappings, currentExam, hsk }: ExamBadgeProps) {
  const examConfig = useExamConfig();
  const exam = currentExam ?? "hsk";
  const level =
    exam === "hsk"
      ? hsk && hsk >= 7
        ? "7-9"
        : hsk
      : examMappings?.[exam as keyof typeof examMappings];
  const label = level !== undefined ? String(level) : String(hsk ?? "");
  const examVar = `--exam-${exam}`;
  return (
    <Badge
      tone="neutral"
      style={{
        backgroundColor: `color-mix(in srgb, var(${examVar}) 12%, transparent)`,
        color: `var(${examVar})`,
        borderColor: `color-mix(in srgb, var(${examVar}) 25%, transparent)`,
      }}
    >
      {examConfig.displayNames[exam] || exam} {label}
    </Badge>
  );
}
