/**
 * Entry point for using fetch-mock-cache with the Bun runtime.
 * @module
 */
import _createFetchCache from "../fetch-cache.js";
// For now, bun is just so awesomely compatible out of the box that there's
// nothing to do.  But, consider bun-optimized calls in the future, if needed.
import { runtime } from "./node.js";
/**
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache/runtimes/bun.js"
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 */
export default function createFetchCache(options = {}) {
    return _createFetchCache(Object.assign(Object.assign({}, options), { runtime }));
}
