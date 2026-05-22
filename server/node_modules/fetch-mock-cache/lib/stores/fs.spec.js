var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { before, describe } from "node:test";
import fs from "fs/promises";
import createFetchCache from "../runtimes/node.js";
import { createTestsForMock } from "../testUtils.js";
import FsStore from "./fs.js";
const nodeFsCacheMock = createFetchCache({ Store: FsStore });
describe("fsStore", () => {
    describe("standard tests", () => {
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            yield fs.rm("./tests/fixtures/http", { force: true, recursive: true });
        }));
        createTestsForMock(nodeFsCacheMock);
    });
});
