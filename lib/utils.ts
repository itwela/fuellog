import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Today's calendar date in the user's local timezone (matches `toISO(new Date())` in MealLogView). */
export function todayISO(): string {
  return toISO(new Date());
}

export function sumMacros(logs: Array<{
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  sugar?: number | null;
  quantity?: number | null;
}>) {
  return logs.reduce(
    (acc, log) => {
      const q = log.quantity != null && log.quantity > 0 ? log.quantity : 1;
      return {
        calories: (acc.calories ?? 0) + (log.calories ?? 0) * q,
        protein: (acc.protein ?? 0) + (log.protein ?? 0) * q,
        fat: (acc.fat ?? 0) + (log.fat ?? 0) * q,
        carbs: (acc.carbs ?? 0) + (log.carbs ?? 0) * q,
        sugar: (acc.sugar ?? 0) + (log.sugar ?? 0) * q,
      };
    },
    {
      calories: 0 as number,
      protein: 0 as number,
      fat: 0 as number,
      carbs: 0 as number,
      sugar: 0 as number,
    }
  );
}

// Returns YYYY-MM-DD for any Date object
export function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Returns 7 Date objects Mon–Sun for the week containing `date`
export function getWeekDays(date: Date): Date[] {
  const day = date.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Returns all Date objects for the given month (year/month are 1-indexed)
export function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  // Offset so grid starts on Monday (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }
  return days;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
  });
}

/** Compress + resize an image file to max 1024px and JPEG 82% before sending to AI. */
export function compressImage(file: File, maxPx = 1024, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = url;
  });
}
