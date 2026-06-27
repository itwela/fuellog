"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export function MacroRing({
  label,
  value,
  unit,
  color,
  goal,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  goal?: number;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  const r = 18;
  const circumference = 2 * Math.PI * r;
  const pct = goal != null && goal > 0 ? Math.min(value / goal, 1) : 0;
  const goalMet = goal != null && goal > 0 && value >= goal;
  const filled = circumference * pct;

  const filledMotion = useMotionValue(0);

  useEffect(() => {
    const c1 = animate(count, value, { duration: 0.6, ease: "easeOut" });
    const c2 = animate(filledMotion, filled, { duration: 0.7, ease: "easeOut" });
    return () => { c1.stop(); c2.stop(); };
  }, [value, filled]);

  const strokeDasharray = useTransform(filledMotion, (f) =>
    `${f} ${circumference - f}`
  );

  return (
    <div
      className={`flex flex-col items-center gap-2 flex-1 rounded-2xl py-4 ${goalMet ? "animate-gradient-border" : ""}`}
      style={
        goalMet
          ? {
              background: `linear-gradient(#1a1a1a, #1a1a1a) padding-box, conic-gradient(from var(--border-angle), rgba(255,255,255,0.04) 70%, ${color} 80%, ${color}99 85%, ${color} 90%, rgba(255,255,255,0.04)) border-box`,
              border: "1px solid transparent",
            }
          : {
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.05)",
            }
      }
    >
      <svg width="46" height="46" viewBox="0 0 46 46">
        {/* Track */}
        <circle
          cx="23" cy="23" r={r}
          fill="none"
          stroke={`${color}22`}
          strokeWidth="4"
        />
        {/* Progress arc */}
        <motion.circle
          cx="23" cy="23" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          style={{ strokeDasharray }}
          transform="rotate(-90 23 23)"
        />
      </svg>

      <p className="text-[10px] font-medium text-[#6a6a6a] -mt-0.5">{label}</p>

      <div className="flex items-baseline gap-0.5">
        <motion.span
          className="text-[26px] font-bold leading-none tabular-nums"
          style={{ color, letterSpacing: "-0.03em" }}
        >
          {rounded}
        </motion.span>
        <span className="text-[10px] text-[#6a6a6a] font-medium">{unit}</span>
      </div>

      {goal != null && goal > 0 && (
        <p className="text-[9px] font-medium tabular-nums" style={{ color: goalMet ? color : "rgba(235,235,245,0.2)" }}>
          {goalMet ? "✓" : `/ ${goal}${unit}`}
        </p>
      )}
    </div>
  );
}
