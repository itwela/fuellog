"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export function MacroRing({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.6, ease: "easeOut" });
    return controls.stop;
  }, [value]);

  const r = 18;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className="flex flex-col items-center gap-2 flex-1 rounded-2xl py-4"
      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <svg width="46" height="46" viewBox="0 0 46 46">
        <circle
          cx="23" cy="23" r={r}
          fill="none"
          stroke={`${color}22`}
          strokeWidth="4"
        />
        <motion.circle
          cx="23" cy="23" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference * 0.25 }}
          animate={{ strokeDashoffset: circumference * 0.25 }}
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
    </div>
  );
}
