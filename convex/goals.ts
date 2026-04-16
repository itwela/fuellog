import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("user_goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const set = mutation({
  args: {
    userId: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("user_goals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fat: args.fat,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("user_goals", { ...args, updatedAt: Date.now() });
    }
  },
});
