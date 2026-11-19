import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { powershellCredentialCommand } from "../src/oauth/credential-store.ts";

// 2026-11-19, Tom-PC (BUG cf4e6e8b): `comvenio login` in a new profile failed with
// "Command failed: powershell.exe … Remove-Item … -ErrorAction SilentlyContinue".
// Removing a missing DPAPI file left $? false, PowerShell exited 1, execFileSync threw.
// Runs only on Windows: it calls the real powershell.exe and DPAPI, inside a temp APPDATA.

const onWindows = process.platform === "win32";
const PROFILE = "probe-test";
let appData = "", savedAppData: string | undefined;

beforeEach(() => {
  savedAppData = process.env.APPDATA;
  appData = mkdtempSync(join(tmpdir(), "comvenio-cli-dpapi-"));
  process.env.APPDATA = appData;
});
afterEach(() => {
  if (savedAppData === undefined) delete process.env.APPDATA;
  else process.env.APPDATA = savedAppData;
  rmSync(appData, { recursive: true, force: true });
});

const credentials = JSON.stringify({
  accessToken: "a".repeat(64), refreshToken: "r".repeat(64), accessExpiresAt: 1_900_000_000,
});
const file = () => join(appData, "Comvenio", `cli-oauth.${PROFILE}.dpapi`);

test.skipIf(!onWindows)("deleting a missing DPAPI file in a new profile succeeds", () => {
  expect(existsSync(file())).toBe(false);
  expect(powershellCredentialCommand("delete", undefined, PROFILE)).toBe("");
});

test.skipIf(!onWindows)("writes, reads, deletes and deletes again without an error", () => {
  powershellCredentialCommand("write", credentials, PROFILE);
  expect(existsSync(file())).toBe(true);
  expect(powershellCredentialCommand("read", undefined, PROFILE)).toBe(credentials);
  expect(powershellCredentialCommand("delete", undefined, PROFILE)).toBe("");
  expect(existsSync(file())).toBe(false);
  expect(powershellCredentialCommand("read", undefined, PROFILE)).toBe("");
  expect(powershellCredentialCommand("delete", undefined, PROFILE)).toBe("");
}, 30_000); // seven powershell.exe starts, about one second each
