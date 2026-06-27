import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";

export const listPaginated = query({
  args: { userId: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { userId, paginationOpts }) => {
    const result = await ctx.db
      .query("food_bank")
      .withIndex("by_user", (idx) => idx.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (item) => ({
          ...item,
          imageUrl: item.imageStorageId
            ? await ctx.storage.getUrl(item.imageStorageId)
            : null,
        }))
      ),
    };
  },
});

export const search = query({
  args: { userId: v.string(), query: v.string() },
  handler: async (ctx, { userId, query: q }) => {
    const items = await ctx.db
      .query("food_bank")
      .withSearchIndex("search_name", (idx) =>
        idx.search("name", q).eq("userId", userId)
      )
      .take(30);
    return await Promise.all(
      items.map(async (item) => ({
        ...item,
        imageUrl: item.imageStorageId
          ? await ctx.storage.getUrl(item.imageStorageId)
          : null,
      }))
    );
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("food_bank")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        calories: args.calories,
        protein: args.protein,
        fat: args.fat,
        carbs: args.carbs,
        fiber: args.fiber,
        sugar: args.sugar,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("food_bank", {
      userId: args.userId,
      name: args.name,
      calories: args.calories,
      protein: args.protein,
      fat: args.fat,
      carbs: args.carbs,
      fiber: args.fiber,
      sugar: args.sugar,
      useCount: 0,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("food_bank"),
    name: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, { ...fields, updatedAt: Date.now() });
  },
});

export const setImage = mutation({
  args: { id: v.id("food_bank"), imageStorageId: v.string() },
  handler: async (ctx, { id, imageStorageId }) => {
    await ctx.db.patch(id, { imageStorageId });
  },
});

export const remove = mutation({
  args: { id: v.id("food_bank") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
