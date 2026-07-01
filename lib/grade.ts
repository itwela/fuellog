export type Grade = { letter: string; color: string };

const GRADE_BANDS: { min: number; letter: string; color: string }[] = [
  { min: 100, letter: "A+", color: "#ffd60a" },
  { min: 90, letter: "A", color: "#b6ff4a" },
  { min: 80, letter: "B", color: "#4abaff" },
  { min: 70, letter: "C", color: "#fdcb40" },
  { min: 60, letter: "D", color: "#ff5623" },
  { min: 0, letter: "F", color: "#ff453a" },
];

/** Letter grade for a percentage of a weekly goal (e.g. avg daily value / daily goal * 100). */
export function gradeForPercent(pct: number): Grade {
  const band = GRADE_BANDS.find((b) => pct >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
  return { letter: band.letter, color: band.color };
}
