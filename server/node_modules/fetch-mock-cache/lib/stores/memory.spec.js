import { describe } from "node:test";
import createFetchCache from "../runtimes/node.js";
import { createTestsForMock } from "../testUtils.js";
import MemoryStore from "./memory.js";
const memoryCacheMock = createFetchCache({ Store: MemoryStore });
describe("memoryStore", () => {
    describe("standard tests", () => createTestsForMock(memoryCacheMock));
});
