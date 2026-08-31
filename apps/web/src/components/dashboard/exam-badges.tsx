"use client"

import type { VocabWord, ExamType, ExamMappings } from "@/types"
import {
  EXAM_BADGE_COLORS,
  EXAM_ABBREVIATIONS,
  useExamConfig,
} from "@/lib/exam-definitions"

interface ExamBadgeProps {
  examType: ExamType
  level: string | number | boolean
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function ExamBadge({
  examType,
  level,
  size = "md",
  showLabel = false,
  className = "",
}: ExamBadgeProps) {
  const examConfig = useExamConfig()
  const color = EXAM_BADGE_COLORS[examType]
  const displayName = examConfig.displayNames[examType] || examType
  const abbreviation = EXAM_ABBREVIATIONS[examType] || examType

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  }

  const levelText = level === true ? "✓" : level === false ? "✗" : String(level)

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
      title={`${displayName} ${levelText}`}
    >
      {showLabel ? (
        <>
          <span className="font-semibold">{abbreviation}</span>
          <span className="mx-1">•</span>
          <span>{levelText}</span>
        </>
      ) : (
        <>
          <span className="font-semibold">{abbreviation}</span>
          <span className="ml-1 opacity-80">{levelText}</span>
        </>
      )}
    </span>
  )
}

interface ExamBadgesProps {
  mappings: ExamMappings
  showEmpty?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ExamBadges({
  mappings,
  showEmpty = false,
  size = "md",
  className = "",
}: ExamBadgesProps) {
  const exams = Object.entries(mappings).filter(([key, value]) => {
    if (key === "metadata") return false
    if (!showEmpty && (value === undefined || value === null)) return false
    return true
  }) as [ExamType, string | number | boolean][]

  if (exams.length === 0) {
    return (
      <span className="text-sm text-ink-soft italic">No exam mappings</span>
    )
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {exams.map(([examType, level]) => (
        <ExamBadge
          key={examType}
          examType={examType}
          level={level}
          size={size}
        />
      ))}
    </div>
  )
}

interface WordExamBadgesProps {
  word: VocabWord
  showAll?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function WordExamBadges({
  word,
  showAll = false,
  size = "md",
  className = "",
}: WordExamBadgesProps) {
  if (!word.examMappings) {
    return <span className="text-sm text-ink-soft italic">No exam data</span>
  }

  return (
    <ExamBadges
      mappings={word.examMappings}
      showEmpty={showAll}
      size={size}
      className={className}
    />
  )
}

interface ExamLevelSelectorProps {
  examType: ExamType
  selectedLevel?: string
  onSelect?: (level: string) => void
  className?: string
}

export function ExamLevelSelector({
  examType,
  selectedLevel,
  onSelect,
  className = "",
}: ExamLevelSelectorProps) {
  const examDefinition = {
    hsk: { name: "HSK", levels: ["1", "2", "3", "4", "5", "6", "7"] },
    tocfl: {
      name: "TOCFL",
      levels: [
        "Novice 1",
        "Novice 2",
        "Level 1",
        "Level 2",
        "Level 3",
        "Level 4",
        "Level 5",
      ],
    },
    goethe: {
      name: "Goethe-Zertifikat",
      levels: ["A1", "A2", "B1", "B2", "C1", "C2"],
    },
    jlpt: { name: "JLPT", levels: ["N5", "N4", "N3", "N2", "N1"] },
    toefl: {
      name: "TOEFL iBT",
      levels: ["0-30", "31-60", "61-80", "81-100", "101-120"],
    },
  }[examType]

  const color = EXAM_BADGE_COLORS[examType]

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {examDefinition.levels.map((level) => {
        const isSelected = selectedLevel === level
        return (
          <button
            key={level}
            type="button"
            onClick={() => onSelect?.(level)}
            className={`rounded-full px-2.5 py-1 text-sm font-medium transition-colors ${
              isSelected ? "font-semibold" : "opacity-80 hover:opacity-100"
            }`}
            style={{
              backgroundColor: isSelected ? color : `${color}15`,
              color: isSelected ? "white" : color,
              border: `1px solid ${color}${isSelected ? "FF" : "40"}`,
            }}
          >
            {level}
          </button>
        )
      })}
    </div>
  )
}

interface ExamFilterBadgeProps {
  examType: ExamType
  level?: string
  onRemove?: () => void
  className?: string
}

export function ExamFilterBadge({
  examType,
  level,
  onRemove,
  className = "",
}: ExamFilterBadgeProps) {
  const examConfig = useExamConfig()
  const color = EXAM_BADGE_COLORS[examType]
  const displayName = examConfig.displayNames[examType] || examType

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="font-semibold">{displayName}</span>
      {level && (
        <>
          <span className="mx-1">•</span>
          <span>{level}</span>
        </>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-1 ml-1.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
          aria-label="Remove filter"
        >
          ×
        </button>
      )}
    </span>
  )
}

interface ExamCoverageBarProps {
  examType: ExamType
  level: string
  current: number
  total: number
  showNumbers?: boolean
  className?: string
}

export function ExamCoverageBar({
  examType,
  level,
  current,
  total,
  showNumbers = true,
  className = "",
}: ExamCoverageBarProps) {
  const examConfig = useExamConfig()
  const color = EXAM_BADGE_COLORS[examType]
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          {examConfig.displayNames[examType] || examType} {level}
        </span>
        {showNumbers && (
          <span className="text-ink-soft">
            {current} / {total} ({Math.round(percentage)}%)
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
