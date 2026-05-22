/**
 * Entry point for using fetch-mock-cache with the Node runtime.
 * @module
 */
import { CreateFetchCacheOptions, FetchCache, Runtime } from "../fetch-cache.js";
export declare const runtime: Runtime;
/**
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache/runtimes/node.js"
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 */
export default function createFetchCache(options?: Partial<CreateFetchCacheOptions>): FetchCache;
