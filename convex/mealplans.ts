import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const plans = await ctx.db
      .query("meal_plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      plans.map(async (plan) => {
        const items = await ctx.db
          .query("meal_plan_items")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect();
        return { ...plan, itemCount: items.length };
      })
    );
  },
});

export const getItems = query({
  args: { planId: v.id("meal_plans") },
  handler: async (ctx, { planId }) => {
    return await ctx.db
      .query("meal_plan_items")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();
  },
});

export const createPlan = mutation({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    return await ctx.db.insert("meal_plans", {
      userId,
      name,
      createdAt: Date.now(),
    });
  },
});

export const renamePlan = mutation({
  args: { id: v.id("meal_plans"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await ctx.db.patch(id, { name });
  },
});

export const deletePlan = mutation({
  args: { id: v.id("meal_plans") },
  handler: async (ctx, { id }) => {
    const items = await ctx.db
      .query("meal_plan_items")
      .withIndex("by_plan", (q) => q.eq("planId", id))
      .collect();
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
    await ctx.db.delete(id);
  },
});

export const addItem = mutation({
  args: {
    planId: v.id("meal_plans"),
    name: v.string(),
    day: v.optional(v.string()),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("meal_plan_items", args);
  },
});

export const removeItem = mutation({
  args: { id: v.id("meal_plan_items") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("meal_plan_items"),
    name: v.optional(v.string()),
    mealType: v.optional(
      v.union(
        v.literal("breakfast"),
        v.literal("lunch"),
        v.literal("dinner"),
        v.literal("snack")
      )
    ),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const reorderItems = mutation({
  args: { ids: v.array(v.id("meal_plan_items")) },
  handler: async (ctx, { ids }) => {
    await Promise.all(ids.map((id, i) => ctx.db.patch(id, { order: i })));
  },
});
