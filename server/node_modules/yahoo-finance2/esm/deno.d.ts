declare namespace _default {
    let name: string;
    let version: string;
    let tasks: {
        cli: string;
        "docs:gen": string;
        "docs:lint": string;
        "docs:open": string;
        "docs:watch": string;
        "install-cli": string;
        schema_: string;
        schema: string;
        test: string;
        "build:npm": string;
        devTODO: string;
    };
    let exports: {
        "./src/index.ts": string;
        ".": string;
        "./createYahooFinance": string;
        "./modules": string;
        "./modules/autoc": string;
        "./modules/chart": string;
        "./modules/dailyGainers": string;
        "./modules/dailyLosers": string;
        "./modules/fundamentalsTimeSeries": string;
        "./modules/historical": string;
        "./modules/insights": string;
        "./modules/options": string;
        "./modules/quoteSummary-iface": string;
        "./modules/quoteSummary": string;
        "./modules/quote": string;
        "./modules/recommendationsBySymbol": string;
        "./modules/screener": string;
        "./modules/search": string;
        "./modules/trendingSymbols": string;
        "./other": string;
        "./other/quoteCombine": string;
        "./lib/moduleCommon": string;
        "./lib/cookieJar": string;
        "./lib/getCrumb": string;
        "./lib/options": string;
    };
    let imports: {
        "@deno/dnt": string;
        "@gadicc/fetch-mock-cache": string;
        "@jest/types": string;
        "@std/async": string;
        "@std/cli": string;
        "@std/expect": string;
        "@std/fmt": string;
        "@std/fs": string;
        "@std/path": string;
        "@std/testing": string;
        "@types/json-schema": string;
        "conventional-changelog-conventionalcommits": string;
        "fetch-mock-cache": string;
        "jest-get-type": string;
        "json-schema": string;
        "oas-schema-walker": string;
        "semantic-release": string;
        "tough-cookie": string;
        "tough-cookie-file-store": string;
        "ts-json-schema-generator": string;
    };
    namespace fmt {
        let exclude: string[];
    }
    namespace publish {
        let exclude_1: string[];
        export { exclude_1 as exclude };
    }
    namespace compilerOptions {
        let lib: string[];
    }
}
export default _default;
//# sourceMappingURL=deno.d.ts.map