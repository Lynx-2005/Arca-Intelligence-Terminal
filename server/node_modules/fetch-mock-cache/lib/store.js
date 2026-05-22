/**
 * The "root" store class.  Unless you are implementing a new store, you
 * probably want to use one of the existing sub-classe, such as `fs` or
 * `memory`.
 *
 * @module
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { deserializeBody } from "./body.js";
/**
 * The "root" store class.  Don't instantiate directly, either use an existing
 * sub-class (e.g. `fs` or `memory`) or extend this class to create a new store
 * class, overriding at least `fetchContent` and `storeContent`, and perhaps,
 * `idFromRequest`, the constructor and others according to your needs.
 *
 * @example
 * ```ts
 * import FMCStore from "fetch-mock-cache/store";
 * import type { FMCCacheContent, FMCStoreOptions } from "fetch-mock-cache/store";
 *
 * export default class MyStore extends FMCStore {
 *   async fetchContent(req: FMCCacheContent["request"]) {
 *     // your implementation here
 *   }
 *   async storeContent(content: FMCCacheContent) {
 *    // your implementation here
 *   }
 * }
 * ```
 */
export default class FMCStore {
    // fetchCache?: FetchCache;
    constructor(options) {
        this.runtime = options.runtime;
    }
    /* **
     * Sets a ref back to fetchCache immediately after instantiation, so the
     * store can easily refer back to this.fetchCache in its methods.
     * @param fetchCache
     */
    /*
    setFetchCache(fetchCache: FetchCache) {
      this.fetchCache = fetchCache;
    }
    */
    /**
     * Given an input string, return a SHA-256 hash of the string, truncated to
     * 7 characters, or to `length`, if specified.
     * @param input - the input string
     * @param length - truncated length of the hash, default: 7
     * @returns the hash, truncated to 7 characters, or to `length`, if specified.
     */
    hash(input_1) {
        return __awaiter(this, arguments, void 0, function* (input, length = 7) {
            return this.runtime.sha256(input, length);
        });
    }
    /**
     * Given an FMCCacheContent.request object, return a Record<string,string>
     * of indentifiers that are unique to the request (e.g. method, headers, body).
     * This will later be used by `idFromRequest` to generate a single unique
     * identifier string.  For each new request, the store will check if a cached
     * copy with the id exists, in which case, it will be returned instead, rather
     * than performing an actual network request.
     * @param request an FMCCacheContent.request object
     * @param hashLen default hash length to use, default: 7
     * @returns a Record<string,string> of unique identifiers, or null if none
     */
    uniqueRequestIdentifiers(request_1) {
        return __awaiter(this, arguments, void 0, function* (request, hashLen = 7) {
            const ids = {};
            if (request.method && request.method !== "GET") {
                ids.method = request.method;
            }
            if (request.headers) {
                ids.headers = yield this.hash(JSON.stringify(request.headers), hashLen);
            }
            const body = yield deserializeBody(request);
            if (body instanceof Uint8Array && body.length > 0) {
                ids.body = yield this.hash(new TextDecoder().decode(body), hashLen);
            }
            else if (typeof body === "string" && body.length > 0) {
                ids.body = yield this.hash(String(body), hashLen);
            }
            else if (body === null || body === undefined) {
                // Should we hash `undefined` and `null` differently?
                // For now, we just treat them both equally as "no body".
            }
            else {
                throw new Error("Unexpected body type");
            }
            return Object.keys(ids).length > 0 ? ids : null;
        });
    }
    /**
     * Given an FMCCacheContent.request object, return a unique string id to
     * identify it.  Uses `uniqueRequestIdentifiers` under the hood.
     * @param request An FMCCacheContent.request object
     * @returns A unique string id
     */
    idFromRequest(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options === null || options === void 0 ? void 0 : options.id)
                return options === null || options === void 0 ? void 0 : options.id;
            let id = request.url;
            const ids = yield this.uniqueRequestIdentifiers(request);
            if (ids) {
                id +=
                    "[" +
                        Object.entries(ids)
                            .map(([k, v]) => k + "=" + v)
                            .join(",") +
                        "]";
            }
            return id;
        });
    }
    /**
     * Given an FMCCacheContent.request object, return the cached content
     * from the store if it exists, or undefined otherwise.
     * @param {FMCCacheContent["request"]} req
     * @returns {Promise<FMCCacheContent | undefined>}
     */
    fetchContent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
    /**
     * Given an FMCCacheContent object, store it in the store.
     * @param {FMCCacheContent} content
     */
    storeContent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    content, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
}
