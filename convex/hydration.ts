import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const log = mutation({
  args: { userId: v.string(), ozAmount: v.number() },
  handler: async (ctx, { userId, ozAmount }) => {
    await ctx.db.insert("hydration_logs", {
      userId,
      ozAmount,
      loggedAt: Date.now(),
    });
  },
});

export const getByDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const start = new Date(date + "T00:00:00").getTime();
    const end = new Date(date + "T23:59:59.999").getTime();
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
