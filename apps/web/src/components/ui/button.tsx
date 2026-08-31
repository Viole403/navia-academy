"use client"

import { forwardRef, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-strong",
        secondary: "border border-line bg-sunken text-ink hover:bg-hover",
        outline: "border border-line-strong text-ink hover:bg-hover",
        ghost: "text-ink-soft hover:bg-hover hover:text-ink",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

interface ButtonProps
  extends
    Omit<HTMLMotionProps<"button">, "ref" | "children">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const shouldReduceMotion = useReducedMotion()
    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </motion.button>
    )
  }
)
