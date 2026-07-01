import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    createdAt: v.number(),
  }),

  meal_logs: defineTable({
    userId: v.string(),
    name: v.string(),
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
    /** Servings count; macros are per single serving. Display total = macro × quantity. */
    quantity: v.optional(v.number()),
    aiEstimated: v.boolean(),
    notes: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    loggedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "loggedAt"]),

  food_bank: defineTable({
    userId: v.string(),
    name: v.string(),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    useCount: v.number(),
    updatedAt: v.number(),
    imageStorageId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["userId"] }),

  grocery_lists: defineTable({
    userId: v.string(),
    name: v.string(),
    archived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    estimatedCost: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  grocery_list_items: defineTable({
    listId: v.id("grocery_lists"),
    name: v.string(),
    quantity: v.optional(v.string()),
    unit: v.optional(v.string()),
    checked: v.boolean(),
    order: v.number(),
  }).index("by_list", ["listId"]),

  exercises: defineTable({
    userId: v.string(),
    name: v.string(),
    muscleGroup: v.optional(v.string()),
    defaultSets: v.optional(v.number()),
    defaultReps: v.optional(v.string()),
    defaultWeight: v.optional(v.string()),
    gifUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["userId"] }),

  workout_sessions: defineTable({
    userId: v.string(),
    name: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    exerciseIds: v.array(v.id("exercises")),
  }).index("by_user", ["userId"]),

  workout_routines: defineTable({
    userId: v.string(),
    name: v.string(),
    exerciseIds: v.array(v.id("exercises")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  user_goals: defineTable({
    userId: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  workout_session_exercises: defineTable({
    sessionId: v.id("workout_sessions"),
    exerciseId: v.id("exercises"),
    order: v.number(),
    sets: v.array(
      v.object({
        reps: v.optional(v.number()),
        weight: v.optional(v.string()),
        completed: v.boolean(),
      })
    ),
    completed: v.boolean(),
  }).index("by_session", ["sessionId"]),

  meal_plans: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  meal_plan_items: defineTable({
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
  }).index("by_plan", ["planId"]),

  hydration_logs: defineTable({
    userId: v.string(),
    ozAmount: v.number(),
    loggedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "loggedAt"]),

  ai_usage: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("text_estimate"),
      v.literal("text_parse"),
      v.literal("image_estimate"),
      v.literal("grocery_parse")
    ),
    model: v.string(),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "createdAt"]),
});
