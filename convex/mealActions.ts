"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { estimateMacrosFromText, estimateMacrosFromImage, parseMealsFromText } from "./lib/ai";

// AI: estimate macros from text description
export const estimateFromText = action({
  args: {
    foodDescription: v.string(),
    knownCalories: v.optional(v.number()),
    knownProtein: v.optional(v.number()),
    knownFat: v.optional(v.number()),
    knownCarbs: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    return await estimateMacrosFromText(args.foodDescription, {
      calories: args.knownCalories,
      protein: args.knownProtein,
      fat: args.knownFat,
      carbs: args.knownCarbs,
    });
  },
});

// AI: parse multiple meals from a blob of text
export const parseFromText = action({
  args: {
    text: v.string(),
    logDate: v.optional(v.string()), // ISO YYYY-MM-DD — tells AI what day context to use
  },
  handler: async (_ctx, { text, logDate }) => {
    return await parseMealsFromText(text, logDate);
  },
});

// AI: estimate macros from image (base64)
export const estimateFromImage = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    return await estimateMacrosFromImage(args.imageBase64, args.mimeType);
  },
});
