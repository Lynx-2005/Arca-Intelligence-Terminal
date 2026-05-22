import { CreateFetchCacheOptions, FetchCache, Runtime } from "../fetch-cache.js";
export declare const runtime: Runtime;
/**
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache/runtimes/deno.ts"
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 */
export default function createFetchCache(options?: Partial<CreateFetchCacheOptions>): FetchCache;
