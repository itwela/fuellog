"use client";

import { motion } from "framer-motion";

export function MacroProgressBar({
  label,
  current,
  goal,
  color,
  unit = "g",
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const remaining = Math.max(goal - current, 0);
  const over = current > goal;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a6a]">{label}</span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-lg font-black leading-none"
            style={{ fontFamily: "var(--font-display)", color: over ? "#ff453a" : color }}
          >
            {Math.round(current)}
          </span>
          <span className="text-[10px] text-[#6a6a6a]">/ {Math.round(goal)}{unit}</span>
        </div>
      </div>

      {/* Track */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#252525" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: over ? "#ff453a" : color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>

      <p className="text-[10px] text-[#6a6a6a]">
        {over
          ? `${Math.round(current - goal)}${unit} over`
          : `${Math.round(remaining)}${unit} remaining`}
      </p>
    </div>
  );
}
