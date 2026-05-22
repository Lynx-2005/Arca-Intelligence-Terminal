import type FMCStore from "./store.js";
declare const origFetch: typeof fetch;
/**
 * A runtime interface with the required subset of built-in runtime functions
 * needed for fech-mock-cache, e.g. `env`, `sha256`, `fs`, `path`, `cwd`.
 */
export interface Runtime {
    name: string;
    env: Record<string, string | undefined>;
    sha256(input: string, length?: number): Promise<string>;
    fs: {
        readFile(path: string): Promise<string>;
        writeFile(path: string, content: string): Promise<void>;
        mkdir(path: string, options: {
            recursive?: boolean;
        }): Promise<string | undefined | void>;
    };
    path: {
        join(...paths: string[]): string;
    };
    cwd: () => string;
}
/**
 * Options to control the behaviour of the `fetch()` calls.
 * Can be passed with experimental fetch._once(options).
 */
export interface FetchCacheOptions {
    /** Manually specify a cache key (usually auto computed from URL) */
    id?: string;
    /** True (default): use cached response if available; false: always fetch from network.
     * You can also provide a promise or function that returns a boolean or promise.
     */
    readCache?: boolean | Promise<boolean> | ((...args: Parameters<FMCStore["fetchContent"]>) => Promise<boolean>);
    /** If a fetch was performed, should we write it to the cache?  Can be a boolean, a
     * promise, or a function that returns a boolean or promise.  In the case of a promise,
     * the write will open occur when the promise resolves, and AFTER the response is
     * returned.  This allows for more complex patterns, where e.g. you could rely on the
     * further processing of the response in other functions before deciding whether to
     * cache it or not, but does require some extra care.
     */
    writeCache?: boolean | Promise<boolean> | ((...args: Parameters<FMCStore["storeContent"]>) => Promise<boolean>);
}
/**
 * Function signature for the created `fetch` / `fetchCache` function.
 * Used to make sure the runtime implementation is compliant.
 */
export interface FetchCache {
    (urlOrRequest: string | Request | URL | undefined, options: RequestInit | undefined): Promise<Response>;
    runtime: Runtime;
    _options?: FetchCacheOptions | FetchCacheOptions[];
    _store?: FMCStore;
    once: (options: FetchCacheOptions) => void;
    /** @deprecated Use once() instead */
    _once: (options: FetchCacheOptions) => void;
}
/**
 * Options for `createFetchCache`.  `Store` is required.  `runtime` is
 * generally passed automatically by each runtime entry point.  `fetch`
 * is optional and defaults to the built-in `fetch` as available at
 * module load time.
 */
export interface CreateFetchCacheOptions {
    runtime: Runtime;
    Store?: typeof FMCStore | [typeof FMCStore, Record<string, unknown>];
    fetch?: typeof origFetch;
}
/**
 * Creates a new caching fetch implementation.  Generally not used directly,
 * instead use the same named function provided by the various run-time entry
 * points.
 */
export default function createCachingMock({ Store, fetch, runtime, }: CreateFetchCacheOptions): FetchCache;
export {};
