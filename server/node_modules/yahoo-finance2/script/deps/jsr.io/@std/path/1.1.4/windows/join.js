"use strict";
// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = join;
const assert_path_js_1 = require("../_common/assert_path.js");
const _util_js_1 = require("./_util.js");
const normalize_js_1 = require("./normalize.js");
const from_file_url_js_1 = require("./from_file_url.js");
/**
 * Join all given a sequence of `paths`,then normalizes the resulting path.
 *
 * @example Usage
 * ```ts
 * import { join } from "@std/path/windows/join";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(join("C:\\foo", "bar", "baz\\.."), "C:\\foo\\bar");
 * assertEquals(join(new URL("file:///C:/foo"), "bar", "baz\\.."), "C:\\foo\\bar");
 * ```
 *
 * @param path The path to join. This can be string or file URL.
 * @param paths The paths to join.
 * @returns The joined path.
 */
function join(path, ...paths) {
    if (path instanceof URL) {
        path = (0, from_file_url_js_1.fromFileUrl)(path);
    }
    paths = path ? [path, ...paths] : paths;
    paths.forEach((path) => (0, assert_path_js_1.assertPath)(path));
    paths = paths.filter((path) => path.length > 0);
    if (paths.length === 0)
        return ".";
    // Make sure that the joined path doesn't start with two slashes, because
    // normalize() will mistake it for an UNC path then.
    //
    // This step is skipped when it is very clear that the user actually
    // intended to point at an UNC path. This is assumed when the first
    // non-empty string arguments starts with exactly two slashes followed by
    // at least one more non-slash character.
    //
    // Note that for normalize() to treat a path as an UNC path it needs to
    // have at least 2 components, so we don't filter for that here.
    // This means that the user can use join to construct UNC paths from
    // a server name and a share name; for example:
    //   path.join('//server', 'share') -> '\\\\server\\share\\'
    let needsReplace = true;
    let slashCount = 0;
    const firstPart = paths[0];
    if ((0, _util_js_1.isPathSeparator)(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if ((0, _util_js_1.isPathSeparator)(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if ((0, _util_js_1.isPathSeparator)(firstPart.charCodeAt(2)))
                        ++slashCount;
                    else {
                        // We matched a UNC path in the first part
                        needsReplace = false;
                    }
                }
            }
        }
    }
    let joined = paths.join("\\");
    if (needsReplace) {
        // Find any more consecutive slashes we need to replace
        for (; slashCount < joined.length; ++slashCount) {
            if (!(0, _util_js_1.isPathSeparator)(joined.charCodeAt(slashCount)))
                break;
        }
        // Replace the slashes if needed
        if (slashCount >= 2)
            joined = `\\${joined.slice(slashCount)}`;
    }
    return (0, normalize_js_1.normalize)(joined);
}
