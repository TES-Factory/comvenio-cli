// Pattern test for G-559 (BUG fe4ecbff): checks and generators here compare
// characters and expect LF. On Windows with core.autocrlf=true a checkout
// without this rule yields CRLF, and the full proof turns red for every PR.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const wurzel = join(import.meta.dir, "..");

describe("Zeilenenden (G-559)", () => {
  test(".gitattributes erzwingt LF für alle Textdateien", () => {
    const regeln = readFileSync(join(wurzel, ".gitattributes"), "utf8")
      .split("\n")
      .map((zeile) => zeile.trim())
      .filter((zeile) => zeile && !zeile.startsWith("#"));
    expect(regeln).toContain("* text=auto eol=lf");
  });

  test("ausgecheckte Doku hat kein CRLF", () => {
    for (const datei of ["docs/homepage.md", "docs/index.json"]) {
      expect(readFileSync(join(wurzel, datei), "utf8").includes("\r\n"), datei).toBe(false);
    }
  });
});
