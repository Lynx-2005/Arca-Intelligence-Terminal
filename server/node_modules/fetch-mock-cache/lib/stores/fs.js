var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * File system store.  Cached content will be written to the file system and
 * can potentially be committed to your project's repository / source control,
 * as fits your needs.  The store is runtime agnostic, as the relevant file
 * system operations are abstracted by the using the correct runtime entry
 * point.
 * @module
 */
import filenamifyUrl from "filenamify-url";
import FMCStore from "../store.js";
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
    constructor(options) {
        super(options);
        this._createdCacheDir = false;
        const defaults = {
            location: this.runtime.path.join("tests", "fixtures", "http"),
        };
        this._cwd = this.runtime.cwd();
        this._location = this.runtime.path.join(this._cwd, options.location || defaults.location);
    }
    // Cache in a sub-folder in the tests folder.
    cache_dir(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._createdCacheDir) {
                this._createdCacheDir = true;
                yield this.runtime.fs.mkdir(this._location, { recursive: true });
            }
            return this.runtime.path.join(this._location, filename);
        });
    }
    idFromRequest(request, options) {
        const _super = Object.create(null, {
            idFromRequest: { get: () => super.idFromRequest }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (options === null || options === void 0 ? void 0 : options.id)
                return (options === null || options === void 0 ? void 0 : options.id) + ".json";
            const id = yield _super.idFromRequest.call(this, request);
            const parts = id.match(/^(.*?)(\[.*\])?$/);
            if (!parts)
                throw new Error("Invalid id");
            return filenamifyUrl(parts[1]) + (parts[2] || "") + ".json";
        });
    }
    pathFromRequest(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.cache_dir(yield this.idFromRequest(request, options));
        });
    }
    fetchContent(request, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = yield this.pathFromRequest(request, options);
            try {
                const content = yield this.runtime.fs.readFile(path);
                return JSON.parse(content);
            }
            catch (_error) {
                return null;
            }
        });
    }
    storeContent(content, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const path = yield this.pathFromRequest(content.request, options);
            yield this.runtime.fs.writeFile(path, JSON.stringify(content, null, 2));
        });
    }
}
