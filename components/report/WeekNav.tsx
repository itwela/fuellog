"use client";

import { motion } from "framer-motion";
import { formatWeekRangeLabel } from "@/lib/utils";

export function WeekNav({
  weekStart,
  isCurrentWeek,
  onPrev,
  onNext,
  onOpenCalendar,
}: {
  weekStart: Date;
  isCurrentWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenCalendar: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <motion.button whileTap={{ scale: 0.85 }} onClick={onPrev} className="p-2 rounded-full text-[#6a6a6a]" style={{ background: "#1a1a1a" }}>
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </motion.button>

      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: "#f2f2f2" }}>
          {isCurrentWeek ? "This week" : formatWeekRangeLabel(weekStart)}
        </p>
        {isCurrentWeek && (
          <p className="text-[10px] text-[#6a6a6a]">{formatWeekRangeLabel(weekStart)}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onNext}
          disabled={isCurrentWeek}
          className="p-2 rounded-full text-[#6a6a6a]"
          style={{ background: "#1a1a1a", opacity: isCurrentWeek ? 0.3 : 1 }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </motion.button>
        <motion.button whileTap={{ scale: 0.85 }} onClick={onOpenCalendar} className="p-2 rounded-full text-[#6a6a6a]" style={{ background: "#1a1a1a" }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}
