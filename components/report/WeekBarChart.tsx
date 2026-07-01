"use client";

import { motion } from "framer-motion";
import { isSameDay } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const CHART_W = 320;
const CHART_H = 120;
const BAR_W = 28;

export function WeekBarChart({
  days,
  values,
  goal,
  color,
  overColor,
  valueFormatter = (v: number) => Math.round(v).toString(),
}: {
  days: Date[];
  values: number[];
  goal: number;
  color: string;
  overColor?: string;
  valueFormatter?: (v: number) => string;
}) {
  const today = new Date();
  const gap = (CHART_W - BAR_W * days.length) / (days.length + 1);
  const scaleMax = Math.max(...values, goal, 1) * 1.15;
  const goalY = goal > 0 ? CHART_H - (goal / scaleMax) * CHART_H : null;

  return (
    <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H + 20}`} preserveAspectRatio="xMidYMid meet">
      {goalY !== null && (
        <line
          x1={0} x2={CHART_W} y1={goalY} y2={goalY}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      )}

      {days.map((day, i) => {
        const x = gap + i * (BAR_W + gap);
        const val = values[i] ?? 0;
        const h = scaleMax > 0 ? (val / scaleMax) * CHART_H : 0;
        const y = CHART_H - h;
        const isOver = !!overColor && goal > 0 && val > goal;
        const isToday = isSameDay(day, today);

        return (
          <g key={i}>
            {val > 0 && (
              <text
                x={x + BAR_W / 2}
                y={Math.max(y - 6, 10)}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="rgba(235,235,245,0.55)"
              >
                {valueFormatter(val)}
              </text>
            )}
            <motion.rect
              x={x}
              width={BAR_W}
              rx={6}
              fill={isOver ? overColor : color}
              opacity={isToday ? 1 : 0.75}
              initial={{ height: 0, y: CHART_H }}
              animate={{ height: h, y }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: i * 0.03 }}
            />
            <text
              x={x + BAR_W / 2}
              y={CHART_H + 16}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={isToday ? color : "rgba(235,235,245,0.35)"}
            >
              {DAY_LABELS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
