#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dntShim = __importStar(require("../_dnt.shims.js"));
const path = __importStar(require("../deps/jsr.io/@std/path/1.1.4/mod.js"));
const tough_cookie_file_store_1 = require("tough-cookie-file-store");
const index_js_1 = __importDefault(require("../src/index.js"));
const cookieJar_js_1 = require("../src/lib/cookieJar.js");
const deno_js_1 = __importDefault(require("../deno.js"));
const versions_js_1 = require("../src/lib/versions.js");
const cookiePath = path.join(dntShim.Deno.env.get("HOME"), ".yf2-cookies.json");
const cookieJar = new cookieJar_js_1.ExtendedCookieJar(new tough_cookie_file_store_1.FileCookieStore(cookiePath));
const yahooFinance = new index_js_1.default({
    cookieJar,
    suppressNotices: ["yahooSurvey"],
});
const moduleNames = Object.getOwnPropertyNames(index_js_1.default.prototype)
    .filter((n) => !n.startsWith("_"));
// moduleNames.push("_chart"); // modules in development
const [moduleName, ...argsAsStrings] = dntShim.Deno.args;
function decodeArgs(stringArgs) {
    return stringArgs.map((arg) => {
        if (arg[0] === "{")
            return JSON.parse(arg);
        if (arg.match(/^[0-9\.]+$/))
            return Number(arg);
        return arg;
    });
}
(async function () {
    if (!moduleName || moduleName === "--help" || moduleName === "-h") {
        console.error("yahoo-finance2 version: " + deno_js_1.default.version);
        console.error("Usage: yahoo-finance.js <module> <args>");
        console.error();
        console.error("Get a quote for AAPL:");
        console.error("$ yahoo-finance.js quoteSummary AAPL");
        console.error();
        console.error("Run the quoteSummary module with two submodules:");
        console.error('$ yahoo-finance.js quoteSummary AAPL \'{"modules":["assetProfile", "secFilings"]}\'');
        console.error();
        console.error("Available modules:");
        console.error(moduleNames.join(", "));
        dntShim.Deno.exit(1);
    }
    if (moduleName === "--version" || moduleName === "-v") {
        const versions = await (0, versions_js_1.versionCheck)();
        console.error(`yahoo-finance2 version: ${versions.current} (latest` +
            (versions.isLatest ? "" : `: ${versions.latest}`) + ")");
        dntShim.Deno.exit(1);
    }
    if (!moduleNames.includes(moduleName)) {
        console.error("No such module: " + moduleName);
        console.error("Available modules: " + moduleNames.join(", "));
        dntShim.Deno.exit(1);
    }
    console.error("Storing cookies in " + cookiePath);
    const args = decodeArgs(argsAsStrings);
    let result;
    try {
        // @ts-expect-error: yes, string is a bad index.
        result = await yahooFinance[moduleName](...args);
    }
    catch (error) {
        if (error instanceof Error) {
            // No need for full stack trace for CLI scripts
            console.error("Exiting with " + error.name + ": " + error.message);
        }
        else {
            console.error("Exiting with error: " + error);
        }
        dntShim.Deno.exit(1);
    }
    if (dntShim.Deno.stdout.isTerminal()) {
        console.dir(result, { depth: null, colors: true });
    }
    else
        console.log(JSON.stringify(result, null, 2));
})();
