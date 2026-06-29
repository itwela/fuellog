import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function dateToNoon(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0, 0);
}

function utcDayBounds(isoDate: string): { start: number; end: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return {
    start: Date.UTC(y, m - 1, d, 0, 0, 0, 0),
    end: Date.UTC(y, m - 1, d, 23, 59, 59, 999),
  };
}

export const log = mutation({
  args: {
    userId: v.string(),
    ozAmount: v.number(),
    logDate: v.optional(v.string()), // ISO date YYYY-MM-DD from the client
  },
  handler: async (ctx, { userId, ozAmount, logDate }) => {
    const loggedAt = logDate ? dateToNoon(logDate) : Date.now();
    await ctx.db.insert("hydration_logs", {
      userId,
      ozAmount,
      loggedAt,
    });
  },
});

export const getByDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const { start, end } = utcDayBounds(date);
    return await ctx.db
      .query("hydration_logs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("loggedAt", start).lte("loggedAt", end)
      )
      .order("desc")
      .collect();
  },
});

export const remove = mutation({
  args: { id: v.id("hydration_logs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
