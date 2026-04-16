import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const getLists = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("grocery_lists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("archived"), false))
      .order("desc")
      .collect();
  },
});

export const getItems = query({
  args: { listId: v.id("grocery_lists") },
  handler: async (ctx, { listId }) => {
    return await ctx.db
      .query("grocery_list_items")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();
  },
});

export const createList = mutation({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, { userId, name }) => {
    return await ctx.db.insert("grocery_lists", {
      userId,
      name,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const addItem = mutation({
  args: {
    listId: v.id("grocery_lists"),
    name: v.string(),
    quantity: v.optional(v.string()),
    unit: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("grocery_list_items", {
      ...args,
      checked: false,
    });
  },
});

export const addItemsBatch = mutation({
  args: {
    listId: v.id("grocery_lists"),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.optional(v.string()),
        unit: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { listId, items }) => {
    const existing = await ctx.db
      .query("grocery_list_items")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();
    let order = existing.reduce((max, row) => Math.max(max, row.order), -1);
    const ids: Id<"grocery_list_items">[] = [];
    for (const item of items) {
      const name = item.name.trim();
      if (!name) continue;
      order += 1;
      const id = await ctx.db.insert("grocery_list_items", {
        listId,
        name,
        quantity: item.quantity?.trim() || undefined,
        unit: item.unit?.trim() || undefined,
        checked: false,
        order,
      });
      ids.push(id);
    }
    return ids;
  },
});

export const toggleItem = mutation({
  args: { id: v.id("grocery_list_items"), checked: v.boolean() },
  handler: async (ctx, { id, checked }) => {
    await ctx.db.patch(id, { checked });
  },
});

/** Update quantity and/or unit; pass empty string to clear that field. */
export const updateItemMeta = mutation({
  args: {
    id: v.id("grocery_list_items"),
    quantity: v.optional(v.string()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, { id, quantity, unit }) => {
    const row = await ctx.db.get(id);
    if (!row) {
      throw new Error("Item not found");
    }
    const patch: { quantity?: string | undefined; unit?: string | undefined } = {};
    if (quantity !== undefined) {
      const q = quantity.trim();
      patch.quantity = q === "" ? undefined : q;
    }
    if (unit !== undefined) {
      const u = unit.trim();
      patch.unit = u === "" ? undefined : u;
    }
    await ctx.db.patch(id, patch);
  },
});

export const resetChecks = mutation({
  args: { listId: v.id("grocery_lists") },
  handler: async (ctx, { listId }) => {
    const items = await ctx.db
      .query("grocery_list_items")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();
    await Promise.all(items.map((item) => ctx.db.patch(item._id, { checked: false })));
  },
});

export const removeItem = mutation({
  args: { id: v.id("grocery_list_items") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const archiveList = mutation({
  args: { id: v.id("grocery_lists") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { archived: true, updatedAt: Date.now() });
  },
});

export const duplicateList = mutation({
  args: { id: v.id("grocery_lists"), userId: v.string() },
  handler: async (ctx, { id, userId }) => {
    const original = await ctx.db.get(id);
    if (!original) return;

    const newListId = await ctx.db.insert("grocery_lists", {
      userId,
      name: `${original.name} (copy)`,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const items = await ctx.db
      .query("grocery_list_items")
      .withIndex("by_list", (q) => q.eq("listId", id))
      .collect();

    await Promise.all(
      items.map((item) =>
        ctx.db.insert("grocery_list_items", {
          listId: newListId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          checked: false,
          order: item.order,
        })
      )
    );

    return newListId;
  },
});
