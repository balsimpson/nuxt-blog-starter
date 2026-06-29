/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminUsers from "../adminUsers.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_clerk from "../lib/clerk.js";
import type * as lib_postSlugs from "../lib/postSlugs.js";
import type * as posts from "../posts.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";
import type * as usersSync from "../usersSync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  "lib/access": typeof lib_access;
  "lib/clerk": typeof lib_clerk;
  "lib/postSlugs": typeof lib_postSlugs;
  posts: typeof posts;
  uploads: typeof uploads;
  users: typeof users;
  usersSync: typeof usersSync;
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
