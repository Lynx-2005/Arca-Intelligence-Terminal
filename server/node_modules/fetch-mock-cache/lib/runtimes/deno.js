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
 * Entry point for using fetch-mock-cache with the Deno runtime.
 * @module
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: for typescript parsing outside of deno
import * as path from "@std/path";
import _createFetchCache from "../fetch-cache.js";
export const runtime = {
    name: "node",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: for typescript parsing outside of deno
    env: Deno.env.toObject(),
    sha256(input, length) {
        return __awaiter(this, void 0, void 0, function* () {
            const utf8 = new TextEncoder().encode(input);
            const hashBuffer = yield crypto.subtle.digest("SHA-256", utf8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray
                .map((bytes) => bytes.toString(16).padStart(2, "0"))
                .join("");
            return length ? hashHex.substring(0, length) : hashHex;
        });
    },
    fs: {
        readFile(path) {
            return __awaiter(this, void 0, void 0, function* () {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore: for typescript parsing outside of deno
                const data = yield Deno.readFile(path);
                const decoder = new TextDecoder("utf-8");
                return decoder.decode(data);
            });
        },
        writeFile(path, content) {
            return __awaiter(this, void 0, void 0, function* () {
                const encoder = new TextEncoder();
                const data = encoder.encode(content);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore: for typescript parsing outside of deno
                return Deno.writeFile(path, data);
            });
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: for typescript parsing outside of deno
        mkdir: Deno.mkdir,
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: for typescript parsing outside of deno
    cwd: Deno.cwd,
    path: {
        join: path.join,
    },
};
/**
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache/runtimes/deno.ts"
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 */
export default function createFetchCache(options = {}) {
    return _createFetchCache(Object.assign(Object.assign({}, options), { runtime }));
}
