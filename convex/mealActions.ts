"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { estimateMacrosFromText, estimateMacrosFromImage, parseMealsFromText } from "./lib/ai";

function resolvedModel(): string {
  return (
    process.env.OPENROUTER_MODELS_ESTIMATE?.split(",")[0]?.trim() ||
    process.env.OPENROUTER_MODELS?.split(",")[0]?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    "openrouter"
  );
}

export const estimateFromText = action({
  args: {
    userId: v.optional(v.string()),
    foodDescription: v.string(),
    knownCalories: v.optional(v.number()),
    knownProtein: v.optional(v.number()),
    knownFat: v.optional(v.number()),
    knownCarbs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const result = await estimateMacrosFromText(args.foodDescription, {
      calories: args.knownCalories,
      protein: args.knownProtein,
      fat: args.knownFat,
      carbs: args.knownCarbs,
    });
    if (args.userId) {
      ctx.runMutation(api.aiUsage.log, {
        userId: args.userId,
        type: "text_estimate",
        model: resolvedModel(),
      }).catch(() => {});
    }
    return result;
  },
});

export const parseFromText = action({
  args: {
    userId: v.optional(v.string()),
    text: v.string(),
    logDate: v.optional(v.string()),
  },
  handler: async (ctx, { userId, text, logDate }) => {
    const result = await parseMealsFromText(text, logDate);
    if (userId) {
      ctx.runMutation(api.aiUsage.log, {
        userId,
        type: "text_parse",
        model: resolvedModel(),
      }).catch(() => {});
    }
    return result;
  },
});

export const estimateFromImage = action({
  args: {
    userId: v.optional(v.string()),
    imageBase64: v.string(),
    mimeType: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await estimateMacrosFromImage(args.imageBase64, args.mimeType, args.context);
    if (args.userId) {
      ctx.runMutation(api.aiUsage.log, {
        userId: args.userId,
        type: "image_estimate",
        model:
          process.env.OPENROUTER_MODELS_VISION?.split(",")[0]?.trim() ||
          resolvedModel(),
      }).catch(() => {});
    }
    return result;
  },
});
