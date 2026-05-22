var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { describe, test as it } from "node:test";
import { expect } from "expect";
import createFetchCache from "./runtimes/node.js";
// import FsStore from "./stores/nodeFs.js";
import MemoryStore from "./stores/memory.js";
const fetchCache = createFetchCache({ Store: MemoryStore });
describe("fetch-mock-cache", () => {
    describe("createFetchCache", () => {
        it("should throw if no store is provided", () => {
            expect(() => createFetchCache()).toThrow(/No `Store` option was provided/);
        });
    });
    describe("created fetchCache", () => {
        it("should throw if no url is provided", (t) => __awaiter(void 0, void 0, void 0, function* () {
            t.mock.method(globalThis, "fetch", fetchCache);
            // @ts-expect-error: intentionally passing undefined to test runtime type checks
            yield expect(fetch()).rejects.toThrow(/urlOrRequest is undefined/);
        }));
        it("should pass options to store methods", (t) => __awaiter(void 0, void 0, void 0, function* () {
            const fetchCache = createFetchCache({ Store: MemoryStore });
            t.mock.method(globalThis, "fetch", fetchCache);
            const store = fetchCache._store;
            const fetchContent = (store.fetchContent = t.mock.fn(store.fetchContent));
            // Baseline, no opts
            yield fetch("http://www.example.com/");
            let optionsArg = fetchContent.mock.calls[0].arguments[1];
            expect(Object.getOwnPropertyNames(optionsArg)).toHaveLength(0);
            // fetchCache._options = [{ id: "id" }];
            fetchCache.once({ id: "id" });
            yield fetch("http://www.example.com/");
            optionsArg = fetchContent.mock.calls[1].arguments[1];
            expect(optionsArg).toMatchObject({ id: "id" });
            // Now let's make sure the options are cleared
            yield fetch("http://www.example.com/");
            optionsArg = fetchContent.mock.calls[2].arguments[1];
            expect(Object.getOwnPropertyNames(optionsArg)).toHaveLength(0);
        }));
    });
});
