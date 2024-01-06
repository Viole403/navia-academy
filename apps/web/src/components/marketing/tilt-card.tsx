"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export function DriftOrb({ className, seed = 0 }: { className?: string; seed?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div aria-hidden className={cn("pointer-events-none absolute rounded-full blur-3xl", className)} />;
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
      animate={{ x: [0, 40 * (seed % 2 ? -1 : 1), 0], y: [0, -28, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 16 + seed * 3, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function Float3D({
  children,
  className,
  tilt = 9,
  z = 0,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
  z?: number;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [tilt, -tilt]), { stiffness: 140, damping: 16 });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-tilt, tilt]), { stiffness: 140, damping: 16 });
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      style={{ rotateX: rX, rotateY: rY, transformStyle: "preserve-3d", transformPerspective: 900, z }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
