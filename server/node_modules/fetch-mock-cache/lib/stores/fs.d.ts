import { FetchCacheOptions } from "../fetch-cache.js";
import type { FMCCacheContent, FMCStoreOptions } from "../store.js";
import FMCStore from "../store.js";
interface FMCFileStoreOptions extends FMCStoreOptions {
    location?: string;
}
/**
 * Used to instantiate a new file system store.
 * @param options e.g. { location: "./tests/fixtures/http" }
 * @returns fs store instance, to pass to `createCachingMock`
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache"; // or /runtimes/deno.js etc
 * import Store from "fetch-mock-cache/stores/fs";
 * const fetchCache = createFetchCache({ Store });
 * ```
 */
export default class FMCFileSystemStore extends FMCStore {
    _createdCacheDir: boolean;
    _cwd: string;
    _location: string;
    constructor(options: FMCFileStoreOptions);
    cache_dir(filename: string): Promise<string>;
    idFromRequest(request: FMCCacheContent["request"], options?: FetchCacheOptions): Promise<string>;
    pathFromRequest(request: FMCCacheContent["request"], options?: FetchCacheOptions): Promise<string>;
    fetchContent(request: FMCCacheContent["request"], options?: FetchCacheOptions): Promise<FMCCacheContent | null>;
    storeContent(content: FMCCacheContent, options?: FetchCacheOptions): Promise<void>;
}
export {};
