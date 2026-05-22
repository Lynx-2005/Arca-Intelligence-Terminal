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
import { deserializeBody, serializeBody } from "./body.js";
describe("body", () => {
    it("serializeBody with text", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = "Hello, world!";
        const serialized = yield serializeBody(new Response(body, {
            headers: { "Content-Type": "text/plain" },
        }));
        expect(serialized).toEqual({ bodyText: body });
    }));
    it("serializeBody with JSON", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = { hello: "world" };
        const serialized = yield serializeBody(new Response(JSON.stringify(body), {
            headers: { "Content-Type": "application/json" },
        }));
        expect(serialized).toEqual({ bodyJson: body });
    }));
    it("serializeBody with binary", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = new Uint8Array([1, 2, 3, 4, 5]);
        const serialized = yield serializeBody(new Response(body, {
            headers: { "Content-Type": "application/octet-stream" },
        }));
        expect(serialized).toEqual({ bodyBase64: "AQIDBAU=" });
    }));
    it("serializeBody with no Response body", () => __awaiter(void 0, void 0, void 0, function* () {
        const serialized = yield serializeBody(new Response(null, {
            headers: { "Content-Type": "application/octet-stream" },
        }));
        expect(serialized).toEqual({ body: null });
    }));
    it("serializeBody with no Request body", () => __awaiter(void 0, void 0, void 0, function* () {
        const serialized = yield serializeBody(new Request("http://www.example.com/", {
            headers: { "Content-Type": "application/octet-stream" },
        }));
        expect(serialized).toEqual({ body: null });
    }));
    it("deserializeBody with text", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = "Hello, world!";
        // @ts-expect-error: test stub
        const deserialized = yield deserializeBody({ bodyText: body });
        const text = yield new Response(deserialized).text();
        expect(text).toBe(body);
    }));
    it("deserializeBody with JSON", () => __awaiter(void 0, void 0, void 0, function* () {
        const body = { hello: "world" };
        // @ts-expect-error: test stub
        const deserialized = yield deserializeBody({ bodyJson: body });
        const text = yield new Response(deserialized).text();
        expect(text).toBe(JSON.stringify(body));
    }));
    it("deserializeBody with binary", () => __awaiter(void 0, void 0, void 0, function* () {
        const bodyBase64 = "AQIDBAU=";
        // @ts-expect-error: test stub
        const deserialized = yield deserializeBody({ bodyBase64 });
        const arrayBuffer = yield new Response(deserialized).arrayBuffer();
        expect(new Uint8Array(arrayBuffer)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    }));
    it("deserializeBody with no body", () => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-expect-error: test stub
        const deserialized = yield deserializeBody({ body: null });
        const text = yield new Response(deserialized).text();
        expect(text).toBe("");
    }));
});
