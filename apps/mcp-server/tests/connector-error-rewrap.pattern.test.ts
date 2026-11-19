import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Pattern test for G-1183 (BUG 947fd9fc): a handler that rebuilds an existing
// ConnectorError — code and request_id taken from the same error — must carry
// its `detail` along. cai.community.03.apply dropped it, so the reviewed reason
// (TAB_VERSION_CONFLICT with tabs) never reached publicToolError.

const ROOT = join(import.meta.dir, "..", "..", "..");
const SOURCES = [join(ROOT, "apps", "mcp-server", "src"), join(ROOT, "packages")];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === "tests" || name === "dist") return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/u.test(name) && !/\.test\.tsx?$/u.test(name) ? [path] : [];
  });
}

/** The object literal passed to each createConnectorError({ … }) call. */
function errorObjects(text: string): string[] {
  const objects: string[] = [];
  const marker = "createConnectorError({";
  for (let start = text.indexOf(marker); start !== -1; start = text.indexOf(marker, start + 1)) {
    let depth = 0;
    const open = start + marker.length - 1;
    for (let i = open; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) {
        objects.push(text.slice(open, i + 1));
        break;
      }
    }
  }
  return objects;
}

function rewraps(): { file: string; object: string }[] {
  return SOURCES.flatMap(sourceFiles).flatMap((file) =>
    errorObjects(readFileSync(file, "utf8")).flatMap((object) => {
      const code = /\bcode:\s*([A-Za-z_$][\w$]*)\.code\b/u.exec(object)?.[1];
      const rebuilt = code !== undefined && new RegExp(`\\brequest_id:\\s*${code}\\.request_id\\b`, "u").test(object);
      return rebuilt ? [{ file: relative(ROOT, file), object }] : [];
    }));
}

describe("G-1183: rebuilt connector errors keep the service's reason", () => {
  test("[community-hub-14/DC-3] every rebuild of an existing ConnectorError carries detail", () => {
    const found = rewraps();
    // Not vacuous: cai.community.03.apply is such a rebuild.
    expect(found.map((entry) => entry.file)).toContain(join("apps", "mcp-server", "src", "tools", "content-homepage-news-data", "handlers.ts"));
    const missing = found.filter((entry) => !/\bdetail\b/u.test(entry.object)).map((entry) => entry.file);
    expect(missing).toEqual([]);
  });
});
