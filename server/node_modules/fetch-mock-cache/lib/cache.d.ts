import type { SerializedBody } from "./body.js";
export interface FMCCacheContent {
    request: {
        url: string;
        headers?: Record<string, string | string[]>;
        method?: RequestInit["method"];
    } & (SerializedBody | {});
    response: {
        ok: boolean;
        status: number;
        statusText: string;
        headers: Record<string, string | string[]>;
    } & (SerializedBody | {});
}
