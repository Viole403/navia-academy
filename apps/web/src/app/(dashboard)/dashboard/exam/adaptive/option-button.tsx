"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface OptionButtonProps {
  option: string
  isPicked: boolean
  onSelect: (option: string) => void
}

function OptionButtonImpl({ option, isPicked, onSelect }: OptionButtonProps) {
  return (
    <button
      disabled={isPicked}
      onClick={() => onSelect(option)}
      className={cn(
        "w-full cursor-pointer rounded-[var(--radius)] border px-4 py-3 text-left transition-colors disabled:cursor-default",
        isPicked
          ? "border-accent bg-accent-soft"
          : "border-line bg-raised hover:border-line-strong hover:bg-hover"
      )}
    >
      <span>{option}</span>
    </button>
  )
}

export const OptionButton = memo(OptionButtonImpl)
