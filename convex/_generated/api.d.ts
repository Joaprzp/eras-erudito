/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cardDeck from "../cardDeck.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as engine_board from "../engine/board.js";
import type * as engine_economy from "../engine/economy.js";
import type * as engine_index from "../engine/index.js";
import type * as engine_scoring from "../engine/scoring.js";
import type * as engine_turn from "../engine/turn.js";
import type * as judge from "../judge.js";
import type * as rooms from "../rooms.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cardDeck: typeof cardDeck;
  constants: typeof constants;
  crons: typeof crons;
  "engine/board": typeof engine_board;
  "engine/economy": typeof engine_economy;
  "engine/index": typeof engine_index;
  "engine/scoring": typeof engine_scoring;
  "engine/turn": typeof engine_turn;
  judge: typeof judge;
  rooms: typeof rooms;
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
