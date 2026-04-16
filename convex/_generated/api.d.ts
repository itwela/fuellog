/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as foodbank from "../foodbank.js";
import type * as goals from "../goals.js";
import type * as grocery from "../grocery.js";
import type * as groceryActions from "../groceryActions.js";
import type * as lib_ai from "../lib/ai.js";
import type * as mealActions from "../mealActions.js";
import type * as meals from "../meals.js";
import type * as workout from "../workout.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  foodbank: typeof foodbank;
  goals: typeof goals;
  grocery: typeof grocery;
  groceryActions: typeof groceryActions;
  "lib/ai": typeof lib_ai;
  mealActions: typeof mealActions;
  meals: typeof meals;
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
