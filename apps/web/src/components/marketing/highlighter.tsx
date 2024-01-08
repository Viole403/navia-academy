"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type HighlighterAction = "underline" | "highlight";

interface HighlighterProps {
  children: ReactNode;
  action?: HighlighterAction;
  /** Any CSS color — pass semantic vars (e.g. var(--bauhaus-red)), never raw hex. */
  color?: string;
  className?: string;
}

/**
 * Animated marker that draws itself once when scrolled into view:
 * a hand-drawn stroke under the words ("underline") or a rounded
 * poster band behind them ("highlight"). Static under reduced motion.
 */
export function Highlighter({
  children,
  action = "underline",
  color = "var(--bauhaus-red)",
  className,
}: HighlighterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });
  const reduce = useReducedMotion();
  const show = inView || Boolean(reduce);

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      {action === "highlight" ? (
        <motion.span
          aria-hidden
          className="absolute inset-x-[-3px] inset-y-[8%] origin-left rounded-full"
          style={{ background: color }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={show ? { scaleX: 1 } : undefined}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        />
      ) : (
        <svg
          aria-hidden
          className="absolute -bottom-1 left-0 h-2 w-full overflow-visible"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M2 5 Q 50 1.5 98 5"
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            animate={show ? { pathLength: 1 } : undefined}
            transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </svg>
      )}
      <span className="relative">{children}</span>
    </span>
  );
}
