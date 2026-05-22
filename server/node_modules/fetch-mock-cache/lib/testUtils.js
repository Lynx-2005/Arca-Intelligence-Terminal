var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { test as it } from "node:test";
import { expect } from "expect";
export function createTestsForMock(mock) {
    it("works with a Request as first argument", (t) => __awaiter(this, void 0, void 0, function* () {
        const url = "https://echo.free.beeceptor.com/?id=test1";
        const expectedResponse = { id: "test1" };
        t.mock.method(globalThis, "fetch", mock);
        const data = yield (yield fetch(new Request(url))).json();
        expect(data.parsedQueryParams).toEqual(expectedResponse);
    }));
    it("works with text response (non-JSON)", (t) => __awaiter(this, void 0, void 0, function* () {
        const url = "https://echoserver.dev/server?query=%7B%22headers%22%3A%5B%5D%2C%22body%22%3A%7B%22type%22%3A%22text%22%2C%22data%22%3A%22hello%22%7D%2C%22status%22%3A200%7D";
        const expectedResponse = "hello";
        t.mock.method(globalThis, "fetch", mock);
        for (let i = 0; i < 2; i++) {
            const response = yield fetch(url);
            const data = yield response.text();
            const expectedCacheHeader = i === 0 ? "MISS" : "HIT";
            expect(response.headers.get("X-FMC-Cache")).toBe(expectedCacheHeader);
            expect(data).toBe(expectedResponse);
        }
    }));
    it("works with a JSON response", (t) => __awaiter(this, void 0, void 0, function* () {
        const url = "https://echo.free.beeceptor.com/?one=two&key=value";
        const expectedResponse = { one: "two", key: "value" };
        t.mock.method(globalThis, "fetch", mock);
        for (let i = 0; i < 2; i++) {
            const response = yield fetch(url);
            const data = yield response.json();
            const expectedCacheHeader = i === 0 ? "MISS" : "HIT";
            expect(response.headers.get("X-FMC-Cache")).toBe(expectedCacheHeader);
            expect(data.parsedQueryParams).toEqual(expectedResponse);
        }
    }));
    it("differentiates requests by headers", (t) => __awaiter(this, void 0, void 0, function* () {
        const url = "https://echo.free.beeceptor.com/?one=two&key=value";
        const expectedResponse = { one: "two", key: "value" };
        t.mock.method(globalThis, "fetch", mock);
        for (let i = 0; i < 2; i++) {
            const response = yield fetch(url, { headers: { "X-Test": "1" } });
            const data = yield response.json();
            const expectedCacheHeader = i === 0 ? "MISS" : "HIT";
            expect(response.headers.get("X-FMC-Cache")).toBe(expectedCacheHeader);
            expect(data.parsedQueryParams).toEqual(expectedResponse);
        }
        for (let i = 0; i < 2; i++) {
            const response = yield fetch(url, { headers: { "X-Test": "2" } });
            const data = yield response.json();
            const expectedCacheHeader = i === 0 ? "MISS" : "HIT";
            expect(response.headers.get("X-FMC-Cache")).toBe(expectedCacheHeader);
            expect(data.parsedQueryParams).toEqual(expectedResponse);
        }
    }));
    it("differentiates requests by body", (t) => __awaiter(this, void 0, void 0, function* () {
        const url = "http://echo.free.beeceptor.com/sample-request";
        const jsonInit = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        };
        t.mock.method(globalThis, "fetch", mock);
        for (let i = 0; i < 2; i++) {
            const body = { a: 1 };
            const response = yield fetch(url, Object.assign(Object.assign({}, jsonInit), { body: JSON.stringify(body) }));
            const data = yield response.json();
            const expectedCacheHeader = i === 0 ? "MISS" : "HIT";
            expect(response.headers.get("X-FMC-Cache")).toBe(expectedCacheHeader);
            expect(data.parsedBody).toEqual(body);
        }
        for (let i = 0; i < 2; i++) {
            const body = { b: 2 };
            const response = yield fetch(url, Object.assign(Object.assign({}, jsonInit), { body: JSON.stringify(body) }));
            const data = yield response.json();
            const expectedCacheHeader = i === 0 ? "MISS" : "HIT";
            expect(response.headers.get("X-FMC-Cache")).toBe(expectedCacheHeader);
            expect(data.parsedBody).toEqual(body);
        }
    }));
}
