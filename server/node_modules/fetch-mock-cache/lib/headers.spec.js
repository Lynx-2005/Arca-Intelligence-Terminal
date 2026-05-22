import { describe, test as it } from "node:test";
import { expect } from "expect";
import { deserializeHeaders, serializeHeaders } from "./headers.js";
describe("headers", () => {
    it("serializeHeaders", () => {
        const headers = new Headers();
        headers.append("X-Test", "1");
        headers.append("set-cookie", "a");
        headers.append("set-cookie", "b");
        const serialized = serializeHeaders(headers);
        expect(serialized).toMatchObject({
            "x-test": "1",
            "set-cookie": ["a", "b"],
        });
    });
    it("unserializeHeaders", () => {
        const serialized = {
            "x-test": "1",
            "set-cookie": ["a", "b"],
        };
        const headers = deserializeHeaders(serialized);
        expect(headers.get("x-test")).toBe("1");
        expect(headers.getSetCookie()).toEqual(["a", "b"]);
    });
});
