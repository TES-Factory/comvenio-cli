import { describe, expect, test } from "bun:test";

import { createConnectorError, type RequestContext } from "@comvenio/connector-contracts";

import { insufficientScopeToolResult } from "../src/oauth-tool-challenge.ts";
import { publicToolError } from "../src/public-tool-error.ts";
import { hasWriteAuthority } from "../src/widgets/confirmation/policy.ts";

const context: RequestContext = {
  request_id: "11111111-1111-4111-8111-111111111111",
  surface: "cli",
  provider: null,
  subject_id: "22222222-2222-4222-8222-222222222222",
  oauth_grant_id: "55555555-5555-4555-8555-555555555555",
  club_id: "33333333-3333-4333-8333-333333333333",
  department_id: null,
  scopes: ["club.read", "role.read.self"],
  capability_version: null,
  locale: "de-DE",
  timezone: "Europe/Berlin",
};

const origin = "https://mcp.comvenio.app";

describe("connector customer errors (01-fehlermodell)", () => {
  test("TC-01: a missing write scope is SCOPE_REQUIRED with all scopes, login command and step-up", () => {
    const result = publicToolError(context, origin, createConnectorError({
      code: "SCOPE_REQUIRED",
      message: "Für diese Aktion fehlt der Anmeldung ein Schreib-Scope.",
      request_id: context.request_id,
      retryable: false,
      required_scope: "admin.write",
      required_scopes: ["admin.write"],
    }), "write");
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      error: "insufficient_scope",
      code: "SCOPE_REQUIRED",
      required_scopes: ["admin.write"],
      next_command: "comvenio login --scopes admin.write,club.read,role.read.self",
      help: "fehler/scope-required",
      request_id: context.request_id,
    });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toStartWith("Fehler SCOPE_REQUIRED:");
    expect(text).not.toContain("nicht verfügbar");
    expect((result._meta as Record<string, string[]>)["mcp/www_authenticate"]![0]).toContain('scope="admin.write"');
  });

  test("PERMISSION_DENIED names the club right as category, not a generic sentence", () => {
    const result = publicToolError(context, origin, createConnectorError({
      code: "PERMISSION_DENIED",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
    }), "read");
    expect(result.structuredContent).toMatchObject({ error: "permission_denied", code: "PERMISSION_DENIED" });
    expect((result.content[0] as { text: string }).text).toContain("Administrator deines Vereins");
  });

  test("a conflict keeps the service's reason; a not-found never does (automatisierungen-07 DC-3, DC-8)", () => {
    const conflict = publicToolError(context, origin, createConnectorError({
      code: "CONFLICT",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail: "automation_changed (live_version: 4)",
    }), "write");
    expect(conflict.structuredContent).toMatchObject({ code: "CONFLICT", detail: "automation_changed (live_version: 4)" });
    expect((conflict.content[0] as { text: string }).text).toContain("\nGrund: automation_changed (live_version: 4)\n");
    const missing = publicToolError(context, origin, createConnectorError({
      code: "NOT_FOUND",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail: "automation_not_found",
    }), "read");
    expect(missing.structuredContent).not.toHaveProperty("detail");
    expect((missing.content[0] as { text: string }).text).not.toContain("automation_not_found");
  });

  test("a stale base on club_page publish keeps tab_changed as reason (community-hub 15 DC-3, BUG 15339d90)", () => {
    const conflict = publicToolError(context, origin, createConnectorError({
      code: "CONFLICT",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail: "tab_changed",
    }), "write");
    expect(conflict.structuredContent).toMatchObject({ code: "CONFLICT", detail: "tab_changed" });
    expect((conflict.content[0] as { text: string }).text).toContain("\nGrund: tab_changed\n");
  });

  test("the community version conflicts keep their reason, code followed by ':' (community-hub 14 DC-3, BUG 947fd9fc)", () => {
    const conflict = (detail: string) => publicToolError(context, origin, createConnectorError({
      code: "CONFLICT",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail,
    }), "write");
    const tabs = "TAB_VERSION_CONFLICT: mindestens eine Seite wurde inzwischen geändert (Tabs: 88888888-8888-4888-8888-888888888888)";
    expect(conflict(tabs).structuredContent).toMatchObject({ code: "CONFLICT", detail: tabs });
    expect((conflict(tabs).content[0] as { text: string }).text).toContain(`\nGrund: ${tabs}\n`);
    const design = "DESIGN_VERSION_CONFLICT: das Design wurde inzwischen geändert, bitte neu laden";
    expect(conflict(design).structuredContent).toMatchObject({ code: "CONFLICT", detail: design });
    expect(conflict("DESIGN_VERSION_CONFLICT").structuredContent).toMatchObject({ detail: "DESIGN_VERSION_CONFLICT" });
    // The ':' only ends a reviewed code; an unreviewed one or a longer word stays out.
    expect(conflict("COMMUNITY_PAGE_FORBIDDEN: diese Seite darfst du nicht bearbeiten").structuredContent).not.toHaveProperty("detail");
    expect(conflict("TAB_VERSION_CONFLICTS: anders").structuredContent).not.toHaveProperty("detail");
    expect(conflict("XTAB_VERSION_CONFLICT: anders").structuredContent).not.toHaveProperty("detail");
    // The ':' is reviewed for these two codes only; the other codes still need their exact
    // form, or free text after "<code>:" would reach the customer (review e20d7bdd).
    expect(conflict("tab_changed: beliebiger Text").structuredContent).not.toHaveProperty("detail");
    expect(conflict("automation_changed: beliebiger Text").structuredContent).not.toHaveProperty("detail");
    const refused = publicToolError(context, origin, createConnectorError({
      code: "VALIDATION_FAILED",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail: "invalid_args: beliebiger Text",
    }), "write");
    expect(refused.structuredContent).not.toHaveProperty("detail");
  });

  test("an unreviewed service reason stays out, even on a refused input (review R3, finance receipts)", () => {
    const foreign = publicToolError(context, origin, createConnectorError({
      code: "VALIDATION_FAILED",
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail: "receipt_invalid: file belongs to another club",
    }), "write");
    expect(foreign.structuredContent).not.toHaveProperty("detail");
    expect((foreign.content[0] as { text: string }).text).not.toContain("another club");
  });

  test("a reviewed code keeps only its reviewed form; free text after it is cut to the code (BUG 8916dcef)", () => {
    const answer = (code: "CONFLICT" | "VALIDATION_FAILED", detail: string) => publicToolError(context, origin, createConnectorError({
      code,
      message: "intern",
      request_id: context.request_id,
      retryable: false,
      detail,
    }), "write");
    const uuid = "88888888-8888-4888-8888-888888888888";
    // Free text behind a reviewed code: only the code passes, in text and structuredContent.
    const cut: [code: "CONFLICT" | "VALIDATION_FAILED", detail: string, kept: string][] = [
      ["VALIDATION_FAILED", "invalid_args Beleg gehört Verein B", "invalid_args"],
      ["CONFLICT", "tab_changed von Max Muster im Verein B", "tab_changed"],
      ["CONFLICT", "automation_changed (live_version: 4) Verein B hat geändert", "automation_changed"],
      ["CONFLICT", "automation_changed (live_version: 4, owner: Verein B)", "automation_changed"],
      ["CONFLICT", "automation_changed(live_version: 4)", "automation_changed"],
      ["CONFLICT", "automation_paused (paused_reason: owner_left, limit: 3)", "automation_paused"],
      ["CONFLICT", "TAB_VERSION_CONFLICT: Verein B hat die Seite geändert", "TAB_VERSION_CONFLICT"],
      ["CONFLICT", `TAB_VERSION_CONFLICT: mindestens eine Seite wurde inzwischen geändert (Tabs: ${uuid}) und mehr`, "TAB_VERSION_CONFLICT"],
      ["CONFLICT", "TAB_VERSION_CONFLICT: mindestens eine Seite wurde inzwischen geändert (Tabs: Verein B)", "TAB_VERSION_CONFLICT"],
      ["CONFLICT", "DESIGN_VERSION_CONFLICT freier Text", "DESIGN_VERSION_CONFLICT"],
      ["CONFLICT", `DESIGN_VERSION_CONFLICT: das Design wurde inzwischen geändert, bitte neu laden (Tabs: ${uuid})`, "DESIGN_VERSION_CONFLICT"],
    ];
    for (const [code, detail, kept] of cut) {
      const result = answer(code, detail);
      expect(result.structuredContent).toMatchObject({ code, detail: kept });
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain(`\nGrund: ${kept}\n`);
      expect(text).not.toContain(detail);
      expect(text).not.toContain("Verein B");
    }
    // The reviewed forms pass unchanged: code, extras from client.ts in their order, the fixed texts.
    for (const detail of [
      "automation_limit_reached (limit: 5)",
      "automation_paused (limit: 3, paused_reason: owner_left)",
      "invalid_args (field: schedule.cron)",
      "TAB_VERSION_CONFLICT",
      "TAB_VERSION_CONFLICT: die Seite wurde inzwischen geändert, bitte neu laden",
      `TAB_VERSION_CONFLICT: mindestens eine Seite wurde inzwischen geändert (Tabs: ${uuid}, ${uuid})`,
    ]) {
      expect(answer("CONFLICT", detail).structuredContent).toMatchObject({ detail });
    }
    // A tab list the client cut at 300 characters keeps its whole ids, nothing else.
    const ids = Array.from({ length: 8 }, (_, index) => `${index}8888888-8888-4888-8888-888888888888`);
    const full = `TAB_VERSION_CONFLICT: mindestens eine Seite wurde inzwischen geändert (Tabs: ${ids.join(", ")})`;
    const cutByClient = `${full.slice(0, 297)}...`;
    const kept = (answer("CONFLICT", cutByClient).structuredContent as { detail: string }).detail;
    expect(kept).toMatch(/^TAB_VERSION_CONFLICT: mindestens eine Seite wurde inzwischen geändert \(Tabs: [0-9a-f-]{36}(, [0-9a-f-]{36})+\)$/u);
    expect(cutByClient.startsWith(kept.slice(0, -1))).toBe(true);
  });

  test("TC-03: a foreign error becomes UNKNOWN_ERROR with the request ID", () => {
    const result = publicToolError(context, origin, new TypeError("boom"), "read");
    expect(result.structuredContent).toMatchObject({
      error: "upstream_unavailable",
      code: "UNKNOWN_ERROR",
      request_id: context.request_id,
    });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain(`Anfrage-ID: ${context.request_id}`);
    expect(text).not.toContain("boom");
  });

  test("an unanswered write says: check the state instead of repeating; a read POST does not", () => {
    const unanswered = (code: "UPSTREAM_TIMEOUT" | "UPSTREAM_UNAVAILABLE") => createConnectorError({
      code,
      message: "intern",
      request_id: context.request_id,
      retryable: false,
    });
    for (const code of ["UPSTREAM_TIMEOUT", "UPSTREAM_UNAVAILABLE"] as const) {
      const write = publicToolError(context, origin, unanswered(code), "write");
      expect(write.structuredContent).toMatchObject({ code: "OUTCOME_UNKNOWN" });
      expect((write.content[0] as { text: string }).text).toContain("Stand prüfen statt wiederholen");
      const read = publicToolError(context, origin, unanswered(code), "read");
      expect(read.structuredContent).toMatchObject({ code });
    }
  });

  test("every scope challenge carries the public fields, also outside publicToolError", () => {
    const result = insufficientScopeToolResult({ public_origin: origin, required_scopes: ["task.read"], context });
    expect(result.structuredContent).toMatchObject({
      error: "insufficient_scope",
      code: "SCOPE_REQUIRED",
      next_command: "comvenio login --scopes club.read,role.read.self,task.read",
      request_id: context.request_id,
    });
  });

  test("write authority needs a writing scope", () => {
    expect(hasWriteAuthority(["club.read", "role.read.self"])).toBe(false);
    expect(hasWriteAuthority(["club.read", "admin.write"])).toBe(true);
    expect(hasWriteAuthority(["files.import"])).toBe(true);
  });
});
