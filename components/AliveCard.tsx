"use client";

import { motion, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type AliveVariant = 1 | 2 | 3 | 4;

function hashToVariant(seed: string): AliveVariant {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % 4) + 1) as AliveVariant;
}

function idleMotion(variant: AliveVariant): MotionProps["animate"] {
  switch (variant) {
    case 1:
      return { opacity: 1, scale: 1, y: [0, -2, 0], rotateZ: [0, 0.3, 0] };
    case 2:
      return { opacity: 1, scale: 1, y: [0, -1, 0], rotateZ: [0, -0.25, 0] };
    case 3:
      return { opacity: 1, scale: 1, y: [0, -1.5, 0], rotateZ: [0, 0.15, 0] };
    case 4:
      return { opacity: 1, scale: 1, y: [0, -2.2, 0], rotateZ: [0, -0.1, 0] };
  }
}

export function AliveCard({
  children,
  className,
  accent,
  seed,
  onClick,
  role,
  tabIndex,
  onKeyDown,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
  /** Used to give each card a stable unique idle animation. */
  seed: string;
  /** Optional interactive props (forwarded). */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  role?: React.HTMLAttributes<HTMLDivElement>["role"];
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}) {
  const variant = useMemo(() => hashToVariant(seed), [seed]);

  const ring = accent ? `${accent}1a` : "#ffffff12";
  const edge = accent ? `${accent}33` : "#2a2a2a";

  return (
    <motion.div
      layout
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={idleMotion(variant)}
      whileHover={{ y: -3, rotateX: 2.2, rotateY: -2.2 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
        y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
        rotateZ: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
        rotateX: { type: "spring", stiffness: 280, damping: 24 },
        rotateY: { type: "spring", stiffness: 280, damping: 24 },
      }}
      className={cn(
        "relative rounded-2xl overflow-hidden will-change-transform",
        "border",
        "shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
      style={{
        background:
          "radial-gradient(120% 120% at 12% 0%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 22%, rgba(0,0,0,0) 60%), #1a1a1a",
        borderColor: edge,
        boxShadow: `0 16px 40px rgba(0,0,0,0.55), 0 1px 0 ${ring} inset`,
        transformStyle: "preserve-3d",
        perspective: 900,
        ...style,
      }}
    >
      {/* subtle “rim” highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 24%)",
        }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

