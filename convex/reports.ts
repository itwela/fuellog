import { v } from "convex/values";
import { query } from "./_generated/server";

/** Bounds for a Mon–Sun week given the Monday as YYYY-MM-DD. */
function utcWeekBoundsMs(weekStartDate: string): { start: number; end: number } {
  const [y, m, d] = weekStartDate.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

export const getWeek = query({
  args: {
    userId: v.string(),
    weekStartDate: v.string(), // Monday, ISO YYYY-MM-DD
  },
  handler: async (ctx, { userId, weekStartDate }) => {
    const { start, end } = utcWeekBoundsMs(weekStartDate);

    const meals = await ctx.db
      .query("meal_logs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("loggedAt", start).lte("loggedAt", end)
      )
      .collect();

    const hydration = await ctx.db
      .query("hydration_logs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("loggedAt", start).lte("loggedAt", end)
      )
      .collect();

    return { meals, hydration };
  },
});
