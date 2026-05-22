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
import Store from "./store.js";
describe("Store", () => {
    describe("idFromRequest", () => {
        it("can be overriden with options", () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-expect-error: stub
            const store = new Store({});
            // @ts-expect-error: stub
            const id = yield store.idFromRequest({}, { id: "id" });
            expect(id).toBe("id");
        }));
    });
    describe("uniqueRequestIdentifiers", () => {
        it("empty request body doesn't get an id", () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-expect-error: stub
            const store = new Store({});
            const ids = yield store.uniqueRequestIdentifiers({
                url: "https://echo.free.beeceptor.com/?id=test1",
                method: "GET",
            });
            expect(ids).toBeNull();
        }));
    });
});
