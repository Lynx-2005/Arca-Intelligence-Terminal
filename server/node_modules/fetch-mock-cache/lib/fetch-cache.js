var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import _debug from "debug";
import { deserializeBody, serializeBody } from "./body.js";
import { deserializeHeaders, serializeHeaders } from "./headers.js";
const debug = _debug("fetch-mock-cache:core");
const origFetch = fetch;
/**
 * Creates a new caching fetch implementation.  Generally not used directly,
 * instead use the same named function provided by the various run-time entry
 * points.
 */
export default function createCachingMock({ Store, fetch, runtime, }) {
    if (!Store) {
        throw new Error("No `Store` option was provided, but is required.  See docs.");
    }
    if (!fetch)
        fetch = origFetch;
    // Init with options if passed as [ Store, { /* ... */ } ]
    const store = Array.isArray(Store)
        ? new Store[0](Object.assign(Object.assign({}, Store[1]), { runtime }))
        : new Store({ runtime });
    const fetchCache = Object.assign(function cachingMockImplementation(urlOrRequest, requestInit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!urlOrRequest)
                throw new Error("urlOrRequest is undefined");
            // TODO, main options?  merge?
            const options = (Array.isArray(fetchCache._options)
                ? fetchCache._options.shift()
                : fetchCache._options) || {};
            let readCache = "readCache" in options ? options.readCache : true;
            let writeCache = "writeCache" in options ? options.writeCache : true;
            const fetchRequest = typeof urlOrRequest === "string" || urlOrRequest instanceof URL
                ? new Request(urlOrRequest, requestInit)
                : urlOrRequest;
            const url = fetchRequest.url;
            const clonedRequest = fetchRequest.clone();
            const cacheContentRequest = Object.assign(Object.assign({ url, method: fetchRequest.method }, (clonedRequest.body && (yield serializeBody(clonedRequest)))), (Array.from(fetchRequest.headers.keys()).length > 0 && {
                // Not really necessary as set-cookie never appears in the REQUEST headers.
                headers: serializeHeaders(fetchRequest.headers),
            }));
            if (typeof readCache === "function") {
                readCache = yield readCache(cacheContentRequest, options);
            }
            const existingContent = readCache && (yield store.fetchContent(cacheContentRequest, options));
            if (existingContent) {
                debug("Using cached copy of %o", url);
                existingContent.response.headers["X-FMC-Cache"] = "HIT";
                return new Response(yield deserializeBody(existingContent.response), {
                    status: existingContent.response.status,
                    statusText: existingContent.response.statusText,
                    headers: deserializeHeaders(existingContent.response.headers),
                });
            }
            debug("Fetching %o", url);
            const p = fetch(url, requestInit);
            const response = yield p;
            const newContent = {
                request: cacheContentRequest,
                response: Object.assign({ ok: response.ok, status: response.status, statusText: response.statusText, headers: serializeHeaders(response.headers) }, (yield serializeBody(response))),
            };
            if (typeof writeCache === "function") {
                writeCache = writeCache(newContent, options);
            }
            if (writeCache instanceof Promise) {
                writeCache
                    .then((shouldWrite) => __awaiter(this, void 0, void 0, function* () {
                    if (shouldWrite) {
                        yield store.storeContent(newContent, options);
                    }
                }))
                    .catch((error) => {
                    console.error("Error occurred while deciding to cache response: %o", error);
                });
            }
            else if (writeCache)
                yield store.storeContent(newContent, options);
            const headers = new Headers(response.headers);
            headers.set("X-FMC-Cache", "MISS");
            return new Response(yield deserializeBody(newContent.response), {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        });
    }, {
        runtime,
        _store: store,
        _options: [], // TODO
        once(options) {
            if (!Array.isArray(this._options))
                this._options = [];
            this._options.push(options);
        },
        _once(options) {
            console.warn("_fetchCache._once() is deprecated, use _fetchCache.once()");
            return this.once(options);
        },
    });
    // store.setFetchCache(fetchCache);
    return fetchCache;
}
