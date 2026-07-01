import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const AI_TYPE = v.union(
  v.literal("text_estimate"),
  v.literal("text_parse"),
  v.literal("image_estimate"),
  v.literal("grocery_parse")
);

export const log = mutation({
  args: {
    userId: v.string(),
    type: AI_TYPE,
    model: v.string(),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("ai_usage", { ...args, createdAt: Date.now() });
  },
});

export const getMonthly = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const records = await ctx.db
      .query("ai_usage")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("createdAt", startOfMonth)
      )
      .collect();

    return {
      month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
      total: records.length,
      text_parse: records.filter((r) => r.type === "text_parse").length,
      text_estimate: records.filter((r) => r.type === "text_estimate").length,
      image_estimate: records.filter((r) => r.type === "image_estimate").length,
      grocery_parse: records.filter((r) => r.type === "grocery_parse").length,
      tokensIn: records.reduce((s, r) => s + (r.tokensIn ?? 0), 0),
      tokensOut: records.reduce((s, r) => s + (r.tokensOut ?? 0), 0),
    };
  },
});
