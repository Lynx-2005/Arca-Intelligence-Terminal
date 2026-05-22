/**
 * Entry point for using fetch-mock-cache with the Node runtime.
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
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import _createFetchCache from "../fetch-cache.js";
export const runtime = {
    name: "node",
    env: Object.assign({}, process.env),
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
        readFile: (path) => __awaiter(void 0, void 0, void 0, function* () { return fs.promises.readFile(path, "utf8"); }),
        writeFile: fs.promises.writeFile,
        mkdir: fs.promises.mkdir,
    },
    path: {
        join: path.join,
    },
    cwd: process.cwd,
};
/**
 * @example
 * ```ts
 * import createFetchCache from "fetch-mock-cache/runtimes/node.js"
 * import Store from "fetch-mock-cache/stores/memory";
 * const fetchCache = createFetchCache({ Store });
 */
export default function createFetchCache(options = {}) {
    return _createFetchCache(Object.assign(Object.assign({}, options), { runtime }));
}
