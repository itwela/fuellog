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
    name: v.optional(v.string()),
    quantity: v.optional(v.string()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, quantity, unit }) => {
    const row = await ctx.db.get(id);
    if (!row) {
      throw new Error("Item not found");
    }
    const patch: { name?: string; quantity?: string | undefined; unit?: string | undefined } = {};
    if (name !== undefined && name.trim()) patch.name = name.trim();
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

export const reorderItems = mutation({
  args: { ids: v.array(v.id("grocery_list_items")) },
  handler: async (ctx, { ids }) => {
    await Promise.all(ids.map((id, i) => ctx.db.patch(id, { order: i })));
  },
});

export const getList = query({
  args: { listId: v.id("grocery_lists") },
  handler: async (ctx, { listId }) => {
    return await ctx.db.get(listId);
  },
});

export const updateListMeta = mutation({
  args: { listId: v.id("grocery_lists"), estimatedCost: v.optional(v.number()) },
  handler: async (ctx, { listId, estimatedCost }) => {
    await ctx.db.patch(listId, { estimatedCost, updatedAt: Date.now() });
  },
});

/* ---------------------------------------------------------------------------
 * Trips — a record of each completed shopping run.
 * ------------------------------------------------------------------------- */

/**
 * Save a finished shopping run. Snapshots the items that were checked off so the
 * record survives later edits to the list itself.
 */
export const saveTrip = mutation({
  args: {
    userId: v.string(),
    listId: v.id("grocery_lists"),
    actualCost: v.optional(v.number()),
    store: v.optional(v.string()),
    notes: v.optional(v.string()),
    /** Defaults to now; supplied when back-dating a trip. */
    shoppedAt: v.optional(v.number()),
    /** When true, checked items are cleared from the list after saving. */
    resetList: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, listId, actualCost, store, notes, shoppedAt, resetList }) => {
    const list = await ctx.db.get(listId);
    if (!list) throw new Error("List not found");
    if (list.userId !== userId) throw new Error("Not your list");

    const items = await ctx.db
      .query("grocery_list_items")
      .withIndex("by_list", (q) => q.eq("listId", listId))
      .collect();

    const purchased = items.filter((i) => i.checked).sort((a, b) => a.order - b.order);

    const tripId = await ctx.db.insert("grocery_trips", {
      userId,
      listId,
      listName: list.name,
      store: store?.trim() || undefined,
      actualCost,
      estimatedCost: list.estimatedCost,
      itemCount: purchased.length,
      notes: notes?.trim() || undefined,
      shoppedAt: shoppedAt ?? Date.now(),
    });

    await Promise.all(
      purchased.map((item, i) =>
        ctx.db.insert("grocery_trip_items", {
          tripId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          order: i,
        })
      )
    );

    // Clear the ticks so the list is ready for the next run.
    if (resetList !== false) {
      await Promise.all(purchased.map((item) => ctx.db.patch(item._id, { checked: false })));
    }

    await ctx.db.patch(listId, { updatedAt: Date.now() });

    return tripId;
  },
});

export const getTrips = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    return await ctx.db
      .query("grocery_trips")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit ?? 50, 200));
  },
});

export const getTripItems = query({
  args: { tripId: v.id("grocery_trips") },
  handler: async (ctx, { tripId }) => {
    const items = await ctx.db
      .query("grocery_trip_items")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect();
    return items.sort((a, b) => a.order - b.order);
  },
});

/** Headline numbers for the Trips view: how often you shop and what it costs. */
export const getTripStats = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const trips = await ctx.db
      .query("grocery_trips")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);

    if (trips.length === 0) {
      return {
        tripCount: 0,
        totalSpend: 0,
        averageCost: null,
        tripsLast30Days: 0,
        spendLast30Days: 0,
        averageDaysBetween: null,
        lastTripAt: null,
      };
    }

    const withCost = trips.filter((t) => t.actualCost != null);
    const totalSpend = withCost.reduce((sum, t) => sum + (t.actualCost ?? 0), 0);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = trips.filter((t) => t.shoppedAt >= thirtyDaysAgo);

    // Trips come back newest-first, so the gap runs from each trip to the one before it.
    let averageDaysBetween: number | null = null;
    if (trips.length >= 2) {
      const spanMs = trips[0].shoppedAt - trips[trips.length - 1].shoppedAt;
      averageDaysBetween =
        Math.round((spanMs / (trips.length - 1) / (24 * 60 * 60 * 1000)) * 10) / 10;
    }

    return {
      tripCount: trips.length,
      totalSpend: Math.round(totalSpend * 100) / 100,
      averageCost:
        withCost.length > 0 ? Math.round((totalSpend / withCost.length) * 100) / 100 : null,
      tripsLast30Days: recent.length,
      spendLast30Days:
        Math.round(recent.reduce((sum, t) => sum + (t.actualCost ?? 0), 0) * 100) / 100,
      averageDaysBetween,
      lastTripAt: trips[0].shoppedAt,
    };
  },
});

export const updateTrip = mutation({
  args: {
    id: v.id("grocery_trips"),
    actualCost: v.optional(v.number()),
    store: v.optional(v.string()),
    notes: v.optional(v.string()),
    shoppedAt: v.optional(v.number()),
  },
  handler: async (ctx, { id, actualCost, store, notes, shoppedAt }) => {
    const patch: {
      actualCost?: number;
      store?: string | undefined;
      notes?: string | undefined;
      shoppedAt?: number;
    } = {};
    if (actualCost !== undefined) patch.actualCost = actualCost;
    if (store !== undefined) patch.store = store.trim() || undefined;
    if (notes !== undefined) patch.notes = notes.trim() || undefined;
    if (shoppedAt !== undefined) patch.shoppedAt = shoppedAt;
    await ctx.db.patch(id, patch);
  },
});

export const deleteTrip = mutation({
  args: { id: v.id("grocery_trips") },
  handler: async (ctx, { id }) => {
    const items = await ctx.db
      .query("grocery_trip_items")
      .withIndex("by_trip", (q) => q.eq("tripId", id))
      .collect();
    await Promise.all(items.map((item) => ctx.db.delete(item._id)));
    await ctx.db.delete(id);
  },
});
