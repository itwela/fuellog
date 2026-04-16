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

  return (
    <div className="flex flex-col items-center gap-1 flex-1 rounded-2xl py-4" style={{ background: "#1a1a1a" }}>
      <p className="text-[9px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <motion.span
          className="text-3xl font-black leading-none"
          style={{ fontFamily: "var(--font-display)", color }}
        >
          {rounded}
        </motion.span>
        <span className="text-[10px] text-[#6a6a6a] font-light">{unit}</span>
      </div>
    </div>
  );
}
