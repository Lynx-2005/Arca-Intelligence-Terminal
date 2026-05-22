/**
 * Entry point for using fetch-mock-cache with the Bun runtime.
 * @module
 */
import { CreateFetchCacheOptions, FetchCache } from "../fetch-cache.js";
/**
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache/runtimes/bun.js"
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 */
export default function createFetchCache(options?: Partial<CreateFetchCacheOptions>): FetchCache;
