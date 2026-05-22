/**
 * In-memory store for cached content.  Can be useful for certain types of
 * testing, but your entire cache will be lost when the process exits.
 * As an alternative, consider the `fs` store, and to commit the genereated
 * files to your project's repository / source control.
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
import FMCStore from "../store.js";
// TODO LRU cache
/**
 * Used to instantiate a new file system store.
 * @param options (usually none)
 * @returns fs store instance, to pass to `createCachingMock`
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache"; // or /runtimes/deno.js etc
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 * ```
 */
export default class FMCMemoryStore extends FMCStore {
    constructor() {
        super(...arguments);
        this.store = new Map();
    }
    fetchContent(req, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = yield this.idFromRequest(req, options);
            return this.store.get(key);
        });
    }
    storeContent(content, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = yield this.idFromRequest(content.request, options);
            this.store.set(key, content);
        });
    }
}
