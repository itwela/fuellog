"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { parseGroceryListFromText } from "./lib/ai";

export const parseFromText = action({
  args: { text: v.string() },
  handler: async (_ctx, { text }) => {
    return await parseGroceryListFromText(text);
  },
});
