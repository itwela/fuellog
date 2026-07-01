"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { parseGroceryListFromText } from "./lib/ai";

export const parseFromText = action({
  args: {
    userId: v.optional(v.string()),
    text: v.string(),
  },
  handler: async (ctx, { userId, text }) => {
    const result = await parseGroceryListFromText(text);
    if (userId) {
      ctx.runMutation(api.aiUsage.log, {
        userId,
        type: "grocery_parse",
        model:
          process.env.OPENROUTER_MODELS_PARSE?.split(",")[0]?.trim() ||
          process.env.OPENROUTER_MODELS?.split(",")[0]?.trim() ||
          "openrouter",
      }).catch(() => {});
    }
    return result;
  },
});
