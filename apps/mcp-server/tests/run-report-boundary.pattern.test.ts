import { describe, expect, test } from "bun:test";

import { fullDomainOperationContracts } from "../src/domain-runtime.ts";
import { K7_ACTION_SCHEMAS } from "../src/tools/identity-club-member-team-role/index.ts";

// BUG 7b331d46: run and history reports passed free service text on — the reason
// and result_text of a failed automation run, the error of a calendar sync run,
// the last error of a subscription, the error message of a weekly preview run.
// They reached MCP text, structuredContent and the CLI. Only a run that succeeded
// keeps its text; any other state, reason or error is a fixed public code.
// Pattern guard: every output field that can carry free text in any domain tool
// is either guarded (canary test below) or reviewed as the club's own content.

const clubId = "41414141-4141-4414-8414-414141414141";
const automationId = "42424242-4242-4424-8424-424242424242";
const runId = "43434343-4343-4434-8434-434343434343";
const subscriptionId = "44444444-4444-4444-8444-444444444444";
const seasonId = "45454545-4545-4454-8454-454545454545";
const planId = "46464646-4646-4464-8464-464646464646";
const departmentId = "47474747-4747-4474-8474-474747474747";
const LEAK = "Verein B: Max Mustermann token=abc";
const FOREIGN = ["Verein B", "Max Mustermann", "token=abc"];

/** Field names that can carry free text (also the names of later tools). */
const FREE_TEXT = /^(error|errors|last_error|reason|result_text|result_summary|summary|message|detail|details|failure|failure_reason|error_message|error_detail|log|output_text|note|notes|status_message|paused_reason|stderr|stdout)$/u;

/** Guarded: the output schema turns these into a fixed public form (tested below). */
const GUARDED: Record<string, readonly string[]> = {
  "cai.club.11.weekly_preview_create": ["$.error"],
  "cai.club.12.weekly_preview_list": ["[].events[].reason", "[].hidden[].reason"],
  "cai.club.16.automation_list": ["[].paused_reason", "[].last_run.reason", "[].last_run.result_text"].map((p) => `.items${p}`),
  "cai.club.18.automation_show": ["$.paused_reason", ".last_run.reason", ".last_run.result_text"],
  "cai.club.19.automation_runs": [".items[].reason", ".items[].result_text"],
  "cai.club.20.automation_create": ["$.paused_reason", ".last_run.reason", ".last_run.result_text"],
  "cai.club.21.automation_update": ["$.paused_reason", ".last_run.reason", ".last_run.result_text"],
  "cai.club.22.automation_pause": ["$.paused_reason", ".last_run.reason", ".last_run.result_text"],
  "cai.club.23.automation_resume": ["$.paused_reason", ".last_run.reason", ".last_run.result_text"],
  "cai.club.24.automation_run": ["$.reason", "$.result_text"],
  "cai.teams.21.ical_list": ["[].last_error", "[].latest_run.error"],
  "cai.teams.22.ical_create": ["$.last_error", ".latest_run.error"],
  "cai.teams.24.ical_activate": ["$.last_error", ".latest_run.error"],
  "cai.teams.25.ical_deactivate": ["$.last_error", ".latest_run.error"],
  "cai.teams.26.sync_now": ["$.error"],
  "cai.teams.27.sync_runs": ["[].error"],
};

/** Reviewed: text the club or the person wrote, or the decision it has to take — no service report. */
const CONTENT: Record<string, { fields: readonly string[]; why: string }> = {
  "cai.feedback.01.create": { fields: ["$.message"], why: "the person's own feedback text" },
  "cai.feedback.02.list": { fields: ["[].message"], why: "the person's own feedback texts" },
  "cai.member.07.family_list": { fields: ["[].notes"], why: "family notes entered by the club" },
  "cai.member.08.family_show": { fields: ["$.notes"], why: "family notes entered by the club" },
  "cai.member.09.family_add": { fields: ["$.notes"], why: "family notes entered by the club" },
  "cai.member.10.family_update": { fields: ["$.notes"], why: "family notes entered by the club" },
  "cai.team.07.resource_list_add_update_remove": { fields: [".items[].notes", ".item.notes"], why: "resource notes entered by the team" },
  "cai.member.17.period_list": { fields: ["[].reason", "[].note"], why: "membership period entered by the club" },
  "cai.member.18.period_show": { fields: ["$.reason", "$.note"], why: "membership period entered by the club" },
  "cai.member.19.period_add": { fields: ["$.reason", "$.note"], why: "membership period entered by the club" },
  "cai.member.20.period_update": { fields: ["$.reason", "$.note"], why: "membership period entered by the club" },
  "cai.teams.28.clarification_list": { fields: ["[].reason"], why: "the open decision of the club's own season sync" },
  "cai.teams.29.clarification_resolve": { fields: [".clarification.reason"], why: "the decided clarification of the club's own season" },
  "cai.teams.31.termin_create": { fields: ["$.note"], why: "the team appointment's note entered by the club" },
  "cai.teams.32.termin_update": { fields: ["$.note"], why: "the team appointment's note entered by the club" },
};

type JsonSchemaNode = {
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
  additionalProperties?: JsonSchemaNode | boolean;
  [keyword: string]: unknown;
};

/** Paths as walked: "$.x" for a top-level field, otherwise ".items[].reason" or "[].error". */
function freeTextFields(node: JsonSchemaNode | undefined, path: string, found: Set<string>): void {
  if (!node || typeof node !== "object") return;
  for (const [key, child] of Object.entries(node.properties ?? {})) {
    if (FREE_TEXT.test(key)) found.add(`${path || "$"}.${key}`);
    freeTextFields(child, `${path}.${key}`, found);
  }
  if (node.items) freeTextFields(node.items, `${path}[]`, found);
  for (const branch of [...(node.anyOf ?? []), ...(node.oneOf ?? []), ...(node.allOf ?? [])]) freeTextFields(branch, path, found);
  if (node.additionalProperties && typeof node.additionalProperties === "object") freeTextFields(node.additionalProperties, `${path}{}`, found);
}

function discovered(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const row of fullDomainOperationContracts()) {
    const found = result.get(row.action_id) ?? new Set<string>();
    freeTextFields(row.output_schema as JsonSchemaNode, "", found);
    if (found.size > 0) result.set(row.action_id, found);
  }
  return result;
}

function expectNoLeak(value: unknown): void {
  const text = JSON.stringify(value);
  for (const fragment of FOREIGN) expect(text).not.toContain(fragment);
}

const failedRun = {
  id: runId, automation_id: automationId, trigger_type: "schedule", state: "failed",
  reason: LEAK, result_text: LEAK, created_at: "2026-11-19T10:00:00+00:00",
};
const automation = {
  id: automationId, club_id: clubId, kind: "club", department_id: null, owner_user_id: null,
  name: "Wochenvorschau", capability_id: "weekly_preview.create", args: {}, trigger: { type: "manual" },
  output: { type: "channel", department_id: null }, approval_mode: "click", objection_hours: null,
  enabled: false, paused_reason: LEAK, failure_streak: 3, last_run: failedRun, version: 2,
  created_at: "2026-11-01T10:00:00+00:00", updated_at: "2026-11-19T10:00:00+00:00",
};
const failedSync = {
  id: runId, subscription_id: subscriptionId, trigger: "MANUAL", status: "FAILED",
  created: 0, updated: 0, cancelled: 0, unchanged: 0, failed: 1, clarifications: 0, error: LEAK,
};
const subscription = {
  id: subscriptionId, team_season_id: seasonId, masked_url: "https://example.org/***", status: "ACTIVE",
  last_error: LEAK, latest_run: failedSync,
};
const entry = { event_id: "e-1", title: "Training", start_time: "2026-11-20T18:00:00+00:00", reason: LEAK.slice(0, 40) };

/** One failing answer per guarded tool, as the service could send it. */
const FAILING: Record<string, unknown> = {
  "cai.club.11.weekly_preview_create": { run_id: runId, plan_id: planId, status: "failed", error: LEAK, function_run_id: runId },
  "cai.club.12.weekly_preview_list": [{
    id: runId, plan_id: planId, plan_run_id: runId, department_id: departmentId, range_start: "2026-11-23", range_end: "2026-11-29",
    events: [entry], hidden: [entry], publish_at: null, published_at: null, created_at: null,
  }],
  "cai.club.16.automation_list": { items: [automation] },
  "cai.club.18.automation_show": automation,
  "cai.club.19.automation_runs": { items: [failedRun] },
  "cai.club.20.automation_create": automation,
  "cai.club.21.automation_update": automation,
  "cai.club.22.automation_pause": automation,
  "cai.club.23.automation_resume": automation,
  "cai.club.24.automation_run": failedRun,
  "cai.teams.21.ical_list": [subscription],
  "cai.teams.22.ical_create": subscription,
  "cai.teams.24.ical_activate": subscription,
  "cai.teams.25.ical_deactivate": subscription,
  "cai.teams.26.sync_now": failedSync,
  "cai.teams.27.sync_runs": [failedSync],
};

function output(actionId: string, value: unknown): unknown {
  return K7_ACTION_SCHEMAS[actionId as keyof typeof K7_ACTION_SCHEMAS].output.parse(structuredClone(value));
}

describe("run and history reports carry no free service text (BUG 7b331d46)", () => {
  test("every free-text field of every domain tool is guarded or reviewed as content", () => {
    const unclassified: string[] = [];
    const stale: string[] = [];
    const found = discovered();
    for (const [actionId, fields] of found) {
      const known = new Set([...(GUARDED[actionId] ?? []), ...(CONTENT[actionId]?.fields ?? [])]);
      for (const field of fields) if (!known.has(field)) unclassified.push(`${actionId} ${field}`);
    }
    for (const [actionId, fields] of [...Object.entries(GUARDED), ...Object.entries(CONTENT).map(([id, c]) => [id, c.fields] as const)]) {
      for (const field of fields) if (!found.get(actionId)?.has(field)) stale.push(`${actionId} ${field}`);
    }
    expect(unclassified).toEqual([]);
    expect(stale).toEqual([]);
  });

  test("every guarded tool has a failing answer in this test", () => {
    expect(Object.keys(FAILING).sort()).toEqual(Object.keys(GUARDED).sort());
  });

  for (const actionId of Object.keys(GUARDED)) {
    test(`${actionId}: a failed run shows no service text`, () => {
      expectNoLeak(output(actionId, FAILING[actionId]));
    });
  }

  test("automation runs: only a succeeded run keeps its text, reasons are known codes", () => {
    const runs = output("cai.club.19.automation_runs", {
      items: [
        failedRun,
        { ...failedRun, state: "succeeded", reason: null, result_text: "3 Termine in der Vorschau" },
        { ...failedRun, state: "skipped", reason: "daily_limit", result_text: null },
        { ...failedRun, state: "awaiting_approval", reason: null, result_text: LEAK },
        { ...failedRun, state: "exploded: Verein B", reason: "approval_superseded" },
      ],
    }) as { items: Array<Record<string, unknown>> };
    expect(runs.items.map((run) => [run.state, run.reason, run.result_text])).toEqual([
      ["failed", "run_failed", null],
      ["succeeded", null, "3 Termine in der Vorschau"],
      ["skipped", "daily_limit", null],
      ["awaiting_approval", null, null],
      ["unknown", "approval_superseded", null],
    ]);
  });

  test("automation: a pause reason outside the known codes is reported as unknown", () => {
    expect((output("cai.club.18.automation_show", automation) as Record<string, unknown>).paused_reason).toBe("unknown");
    expect((output("cai.club.18.automation_show", { ...automation, paused_reason: "repeated_failures" }) as Record<string, unknown>).paused_reason)
      .toBe("repeated_failures");
    expect((output("cai.club.18.automation_show", { ...automation, paused_reason: null }) as Record<string, unknown>).paused_reason).toBeNull();
  });

  test("sync runs: a succeeded run has no error, a failed one a known code or SYNC_FAILED", () => {
    const runs = output("cai.teams.27.sync_runs", [
      failedSync,
      { ...failedSync, error: "FETCH_TIMEOUT" },
      { ...failedSync, status: "SUCCEEDED", error: "EMPTY_FEED" },
      { ...failedSync, status: "EXPLODED", error: null },
    ]) as Array<Record<string, unknown>>;
    expect(runs.map((run) => [run.status, run.error])).toEqual([
      ["FAILED", "SYNC_FAILED"],
      ["FAILED", "FETCH_TIMEOUT"],
      ["SUCCEEDED", null],
      ["unknown", null],
    ]);
    const shown = output("cai.teams.21.ical_list", [subscription]) as Array<Record<string, unknown>>;
    expect(shown[0]?.last_error).toBe("SYNC_FAILED");
    expect((shown[0]?.latest_run as Record<string, unknown>).error).toBe("SYNC_FAILED");
  });

  test("weekly preview: a failed run says run_failed, a hidden entry a known reason", () => {
    expect(output("cai.club.11.weekly_preview_create", FAILING["cai.club.11.weekly_preview_create"]))
      .toMatchObject({ status: "failed", error: "run_failed" });
    const snapshots = output("cai.club.12.weekly_preview_list", [{
      ...(FAILING["cai.club.12.weekly_preview_list"] as Array<Record<string, unknown>>)[0],
      hidden: [{ ...entry, reason: "not_public" }, entry],
    }]) as Array<{ hidden: Array<Record<string, unknown>> }>;
    expect(snapshots[0]?.hidden.map((item) => item.reason)).toEqual(["not_public", "hidden"]);
  });

  test("the published output schema is unchanged by the guard", () => {
    const row = fullDomainOperationContracts().find((contract) => contract.action_id === "cai.club.19.automation_runs");
    const item = ((row?.output_schema as JsonSchemaNode).properties?.items as JsonSchemaNode).items as JsonSchemaNode;
    expect(item.properties?.reason).toEqual({ anyOf: [{ type: "string", maxLength: 2000 }, { type: "null" }] });
    expect(item.properties?.result_text).toEqual({ anyOf: [{ type: "string", maxLength: 20000 }, { type: "null" }] });
  });

  test("through the tool: a failed automation run reaches the answer without service text", async () => {
    const { createComvenioApiClient } = await import("@comvenio/comvenio-client");
    const { createK7ToolSets } = await import("../src/tools/identity-club-member-team-role/tool-sets.ts");
    const context = {
      request_id: "48484848-4848-4484-8484-484848484848", surface: "mcp", provider: "openai",
      subject_id: "49494949-4949-4494-8494-494949494949", oauth_grant_id: "4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a",
      club_id: clubId, department_id: null, scopes: ["club.read"], capability_version: "D".repeat(43),
      locale: "de-DE", timezone: "Europe/Berlin",
    } as const;
    const snapshot = {
      subject_id: context.subject_id, member_id: runId, club_id: clubId, department_ids: [], permissions: {}, sources: [],
      capability_version: context.capability_version, generated_at: new Date().toISOString(),
      observed_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const client = createComvenioApiClient({ gatewayBaseUrl: "https://apidev.comvenio.app" }, {
      fetch: async () => Response.json({ items: [failedRun] }),
    });
    const club = createK7ToolSets({ client }).club;
    const answer = await club.execute({
      action_id: "cai.club.19.automation_runs",
      input: { club_id: clubId, automation_id: automationId },
      context: context as never,
      capability_snapshot: snapshot as never,
    });
    expectNoLeak(answer);
    expect(answer.result).toMatchObject({ items: [{ state: "failed", reason: "run_failed", result_text: null }] });
  });
});
