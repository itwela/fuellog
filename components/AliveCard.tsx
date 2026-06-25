"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AliveCard({
  children,
  className,
  accent,
  seed: _seed,
  onClick,
  role,
  tabIndex,
  onKeyDown,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
  seed: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  role?: React.HTMLAttributes<HTMLDivElement>["role"];
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      layout
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={{
        opacity: { duration: 0.18 },
        y: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] },
        scale: { type: "spring", stiffness: 500, damping: 42 },
        layout: { type: "spring", stiffness: 380, damping: 36 },
      }}
      className={cn("relative rounded-2xl overflow-hidden", className)}
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.06)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
