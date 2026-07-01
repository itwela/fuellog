/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiUsage from "../aiUsage.js";
import type * as fileStorage from "../fileStorage.js";
import type * as foodbank from "../foodbank.js";
import type * as goals from "../goals.js";
import type * as grocery from "../grocery.js";
import type * as groceryActions from "../groceryActions.js";
import type * as hydration from "../hydration.js";
import type * as lib_ai from "../lib/ai.js";
import type * as mealActions from "../mealActions.js";
import type * as mealplans from "../mealplans.js";
import type * as meals from "../meals.js";
import type * as migrations from "../migrations.js";
import type * as reports from "../reports.js";
import type * as workout from "../workout.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiUsage: typeof aiUsage;
  fileStorage: typeof fileStorage;
  foodbank: typeof foodbank;
  goals: typeof goals;
  grocery: typeof grocery;
  groceryActions: typeof groceryActions;
  hydration: typeof hydration;
  "lib/ai": typeof lib_ai;
  mealActions: typeof mealActions;
  mealplans: typeof mealplans;
  meals: typeof meals;
  migrations: typeof migrations;
  reports: typeof reports;
  workout: typeof workout;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
