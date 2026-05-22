/**
 * @module
 * Headers need special handling for "set-cookie" headers.
 * Node v19.7.0+ has a `getSetCookie` method on the Headers class.
 * node-fetch v3.0.0+ has a `raw` method on the Headers class.
 * In browser environments its irrelevant.
 */
/**
 * Given a Headers object, return a plain object with the headers.
 * The "set-cookie" header is handled differently in different environments.
 */
export declare function serializeHeaders(headers: Headers): Record<string, string>;
/**
 * Given a Record<string, string | string[]>, return a Headers object.
 */
export declare function deserializeHeaders(serialized: Record<string, string | string[]>): Headers;
