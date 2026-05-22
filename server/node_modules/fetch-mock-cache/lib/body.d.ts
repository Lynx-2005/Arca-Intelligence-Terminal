import type { FMCCacheContent } from "./cache.js";
export type SerializedBody = {
    bodyText: string;
} | {
    bodyJson: object;
} | {
    bodyBase64: string;
} | {
    body: null;
};
export declare function serializeBody(response: Response | Request): Promise<SerializedBody>;
export declare function deserializeBody(objWithBody: FMCCacheContent["response"] | FMCCacheContent["request"]): Promise<BodyInit | null>;
