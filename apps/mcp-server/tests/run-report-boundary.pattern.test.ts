import { describe, expect, test } from "bun:test";

import { ASYNC_JOB_HANDLE_SCHEMA } from "@comvenio/connector-contracts";
import { z } from "zod";

import { fullDomainOperationContracts } from "../src/domain-runtime.ts";
import { executeK8Operation } from "../src/tools/event-plan/handlers.ts";
import { K7_ACTION_SCHEMAS } from "../src/tools/identity-club-member-team-role/index.ts";
import { collect as collectNodes, display, isOpen, isText, walk, type JsonSchemaNode } from "./support/output-schema.ts";

// BUG 7b331d46: run and history reports passed free service text on — the reason
// and result_text of a failed automation run, the error of a calendar sync run,
// the last error of a subscription, the error message of a weekly preview run, the
// exception texts of an external team sync. They reached MCP text,
// structuredContent and the CLI. Only a run that succeeded keeps its text; any
// other state, kind, reason or error is a known word of its service or a fixed code.
//
// Pattern guard over every domain tool:
// 1. every output field with a free-text name is guarded or reviewed as the club's content;
// 2. every open output (z.json) of a run, sync, history, status, import or export tool is
//    guarded or reviewed — an open output shows whatever the service sends;
// 3. a guarded tool gets the canary in EVERY text field of its answer, not only in the
//    named ones: whatever is not checked and not reviewed content makes the test red.
// The club agent's run_refs are covered in tenant-isolation.integration.test.ts (TC-02).

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
const FREE_TEXT = /^(error|errors|last_error|reason|result_text|result_summary|summary|message|detail|details|failure|failure_reason|error_message|error_detail|log|output_text|note|notes|status_message|paused_reason|stderr|stdout|sync_log|last_sync_summary|warnings)$/u;

/**
 * Tools whose answer is a run, sync, history, status, import or export report. Matched
 * against "<action_id> <operation>": a bundled action names its run in the operation
 * (review 4a8506f4).
 */
const RUN_LIKE = /(run|sync|automation|weekly_preview|ical|clarification|history|_log|status|job|import|export|protocol)/u;

/** Guarded: the answer turns these into a fixed public form (canary tests below). */
const GUARDED: Record<string, readonly string[]> = {
  "cai.club.11.weekly_preview_create": ["$.error"],
  "cai.club.12.weekly_preview_list": ["[].events[].reason", "[].hidden[].reason"],
  "cai.club.16.automation_list": [".items[].paused_reason", ".items[].last_run.reason", ".items[].last_run.result_text"],
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
  // utils/ical_parse.py warnings name a feed UID: only their kind passes (publicActivationPreview).
  "cai.teams.23.ical_preview": ["$.warnings"],
  // type and status pass only as known words (publicClarification); reason is reviewed content below.
  "cai.teams.28.clarification_list": [],
  "cai.teams.29.clarification_resolve": [],
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
  // event-service utils/calendar_sync.py _open_clarification: detail is one of two fixed sentences
  // of the service with a start time or a run count ("Ähnlicher Termin einer anderen UID um …",
  // "Fehlt seit … vollständigen Läufen …") about the club's own season — no exception text.
  "cai.teams.28.clarification_list": { fields: ["[].reason"], why: "the open decision of the club's own season sync" },
  "cai.teams.29.clarification_resolve": { fields: [".clarification.reason"], why: "the decided clarification of the club's own season" },
  "cai.teams.31.termin_create": { fields: ["$.note"], why: "the team appointment's note entered by the club" },
  "cai.teams.32.termin_update": { fields: ["$.note"], why: "the team appointment's note entered by the club" },
};

/** Open outputs of run-like tools that are guarded in their handler (canary test below). */
const OPEN_GUARDED: Record<string, readonly string[]> = {
  "cai.event.25.external_sync_workflows": ["$", "[]"],
  // trigger_event: only known kinds, ids and time pass (publicTriggerEvent).
  "cai.club.16.automation_list": [".items[].last_run.trigger_event"],
  "cai.club.18.automation_show": [".last_run.trigger_event"],
  "cai.club.19.automation_runs": [".items[].trigger_event"],
  "cai.club.20.automation_create": [".last_run.trigger_event"],
  "cai.club.21.automation_update": [".last_run.trigger_event"],
  "cai.club.22.automation_pause": [".last_run.trigger_event"],
  "cai.club.23.automation_resume": [".last_run.trigger_event"],
  "cai.club.24.automation_run": ["$.trigger_event"],
};

/** Open outputs of run-like tools that carry the club's own content or a job handle. */
const AUTOMATION_CONFIG = { fields: ["$.args", "$.trigger", "$.output"], why: "the automation's own configuration as the club set it" };
const OPEN_CONTENT: Record<string, { fields: readonly string[]; why: string }> = {
  "cai.club.16.automation_list": { fields: AUTOMATION_CONFIG.fields.map((f) => `.items[]${f.slice(1)}`), why: AUTOMATION_CONFIG.why },
  "cai.club.18.automation_show": AUTOMATION_CONFIG,
  "cai.club.20.automation_create": AUTOMATION_CONFIG,
  "cai.club.21.automation_update": AUTOMATION_CONFIG,
  "cai.club.22.automation_pause": AUTOMATION_CONFIG,
  "cai.club.23.automation_resume": AUTOMATION_CONFIG,
  "cai.club.17.automation_options": { fields: [".functions[]"], why: "the released function catalogue of the club" },
  "cai.data.35.export_members_bookings": { fields: ["$", "[]"], why: "job handle of an export; status through cv_job_status_read (enum-typed)" },
  "cai.menu.10.export": { fields: ["$", "[]"], why: "job handle of an export; status through cv_job_status_read (enum-typed)" },
  "cai.plan.11.export": { fields: ["$", "[]"], why: "job handle of an export; status through cv_job_status_read (enum-typed)" },
  "cai.finance.30.audit_export": { fields: ["$", "[]"], why: "the club's own audit records as export content" },
  "cai.finance.13.position_import_shopping": { fields: ["$", "[]"], why: "the budget position after the import, the club's own data" },
  "cai.tournament.12.status": { fields: ["$", "[]"], why: "the tournament after its status change, the club's own data" },
  "cai.meeting.02.protocol_list_show_create_update_delete_advance_revert_updates_validat": { fields: ["$", "[]"], why: "the club's own meeting protocol" },
  "cai.meeting.04.note_list_list_protocol_create_update_delete": { fields: ["$", "[]"], why: "the club's own meeting notes" },
  "cai.meeting.09.resolution_list_list_protocol_show_history_create_update_approve_decli": { fields: ["$", "[]"], why: "the club's own resolutions and their history" },
  // Found through their operation (review 4a8506f4).
  "cai.event.18.sponsor_and_sponsor_program_workflows": { fields: ["$", "[]"], why: "tier_sync: event-service SponsorTierSyncResult, counters only" },
  "cai.event.19.invitation_and_club_invitation_workflows": { fields: ["$", "[]"], why: "member_status: the club's own invitation after its status change" },
  "cai.event.24.dj_settings_and_request_workflows": { fields: ["$", "[]"], why: "request_status: the club's own DJ request after its status change" },
  "cai.finance.31.finance_views": { fields: ["$", "[]"], why: "department_history: finance-service DepartmentHistory, the club's own yearly sums" },
  "cai.shopping.06.show": { fields: ["$", "[]"], why: "export: job handle; status through cv_job_status_read (enum-typed)" },
  "cai.tournament.25.preview": { fields: ["$", "[]"], why: "export: job handle; status through cv_job_status_read (enum-typed)" },
};

/**
 * Text fields of guarded answers that are the club's own content — no service report. Ids
 * and times are not exempt: they pass only in their form and get the canary (review 4a8506f4).
 */
const REVIEWED_TEXT = new Set([
  "name", "title", "location", "masked_url", "token", "external_id", "mapping", "team_label",
]);

const contracts = fullDomainOperationContracts();

/** filter gets "<action_id> <operation>" of each contract row. */
function collect(select: (node: JsonSchemaNode, key: string | null) => boolean, filter: (name: string) => boolean = () => true) {
  return collectNodes(contracts, select, filter);
}

function unclassified(found: Map<string, Set<string>>, ...lists: Array<Record<string, readonly string[]>>): string[] {
  const missing: string[] = [];
  for (const [actionId, fields] of found) {
    const known = new Set(lists.flatMap((list) => list[actionId] ?? []));
    for (const field of fields) if (!known.has(field)) missing.push(`${actionId} ${field}`);
  }
  return missing.sort();
}

function stale(found: Map<string, Set<string>>, ...lists: Array<Record<string, readonly string[]>>): string[] {
  const missing: string[] = [];
  for (const list of lists) {
    for (const [actionId, fields] of Object.entries(list)) {
      for (const field of fields) if (!found.get(actionId)?.has(field)) missing.push(`${actionId} ${field}`);
    }
  }
  return missing.sort();
}

const fieldsOf = (list: Record<string, { fields: readonly string[] }>) =>
  Object.fromEntries(Object.entries(list).map(([id, entry]) => [id, entry.fields]));

function expectNoLeak(value: unknown): void {
  const text = JSON.stringify(value);
  for (const fragment of FOREIGN) expect(text).not.toContain(fragment);
}

const failedRun = {
  id: runId, automation_id: automationId, trigger_type: "event", scheduled_for: null, state: "failed",
  reason: LEAK, function_run_id: runId, result_text: LEAK, approval_request_id: null, delivery_state: "failed",
  delivered_message_id: null,
  trigger_event: { event_type: "event.upcoming", event_key: LEAK, subject_type: "event", subject_id: planId, actor_user_id: null, occurred_at: "2026-11-19T09:00:00+00:00", note: LEAK },
  started_at: null, finished_at: null, created_at: "2026-11-19T10:00:00+00:00",
};
const automation = {
  id: automationId, club_id: clubId, kind: "club", department_id: null, owner_user_id: null,
  name: "Wochenvorschau", capability_id: "weekly_preview.create", args: {}, trigger: { type: "manual" },
  output: { type: "channel", department_id: null }, approval_mode: "click", objection_hours: null,
  enabled: false, paused_reason: LEAK, failure_streak: 3, next_run_at: null, last_run_at: null, runs_today: 0,
  last_run: failedRun, version: 2, created_at: "2026-11-01T10:00:00+00:00", updated_at: "2026-11-19T10:00:00+00:00",
};
const failedSync = {
  id: runId, subscription_id: subscriptionId, trigger: "MANUAL", status: "FAILED",
  created: 0, updated: 0, cancelled: 0, unchanged: 0, failed: 1, clarifications: 0,
  started_at: null, finished_at: null, error: LEAK,
};
const subscription = {
  id: subscriptionId, team_season_id: seasonId, masked_url: "https://example.org/***", status: "ACTIVE",
  last_success_at: null, last_error: LEAK, last_error_at: null, next_sync_at: null, latest_run: failedSync,
};
const clarification = {
  id: runId, team_season_id: seasonId, type: LEAK, status: LEAK, title: "Wettbewerb zuordnen", reason: "Fehlt seit 3 vollständigen Läufen",
};
const entry = { event_id: "e-1", title: "Training", start_time: "2026-11-20T18:00:00+00:00", end_time: null, location: null, reason: LEAK };

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
  "cai.teams.23.ical_preview": {
    token: "preview-token", expires_at: "2026-11-19T11:00:00+00:00",
    entries: [{ external_id: "uid-1", starts_at: null, ends_at: null, title: "Spiel", mapping: "MATCH" }],
    warnings: [`Nicht zuordenbarer Wettbewerb: ${LEAK}`, `Klärungsfall ${LEAK}`, LEAK],
  },
  "cai.teams.28.clarification_list": [clarification],
  "cai.teams.29.clarification_resolve": { clarification, resource_reconcile_triggered: false },
};

function output(actionId: string, value: unknown): unknown {
  return K7_ACTION_SCHEMAS[actionId as keyof typeof K7_ACTION_SCHEMAS].output.parse(structuredClone(value));
}

/** Writes the canary into every element the path reaches; false when a step is missing. */
function setAt(target: unknown, path: string, value: unknown): boolean {
  const steps = path.replace(/^\$/u, "").split(/(?=\.)|(?=\[\])/u).filter(Boolean);
  const go = (node: unknown, rest: string[]): boolean => {
    const [step, ...tail] = rest;
    if (step === undefined) return true;
    if (step === "[]") return Array.isArray(node) && node.length > 0 && node.every((item) => go(item, tail));
    const name = step.slice(1);
    if (node === null || typeof node !== "object" || Array.isArray(node)) return false;
    const record = node as Record<string, unknown>;
    if (tail.length === 0) { record[name] = value; return true; }
    return go(record[name], tail);
  };
  return go(target, steps);
}

function textFields(actionId: string): string[] {
  const row = contracts.find((contract) => contract.action_id === actionId);
  const found = new Set<string>();
  const content = new Set(CONTENT[actionId]?.fields ?? []);
  walk(row?.output_schema as JsonSchemaNode, "", (node, path, key) => {
    if (key !== null && isText(node) && !REVIEWED_TEXT.has(key) && !content.has(display(path))) found.add(path);
  });
  return [...found].sort();
}

describe("run and history reports carry no free service text (BUG 7b331d46)", () => {
  test("every free-text field of every domain tool is guarded or reviewed as content", () => {
    const found = collect((_node, key) => key !== null && FREE_TEXT.test(key));
    expect(unclassified(found, GUARDED, fieldsOf(CONTENT))).toEqual([]);
    expect(stale(found, GUARDED, fieldsOf(CONTENT))).toEqual([]);
  });

  test("every open output of a run-like tool is guarded or reviewed", () => {
    const found = collect((node) => isOpen(node), (name) => RUN_LIKE.test(name));
    expect(unclassified(found, OPEN_GUARDED, fieldsOf(OPEN_CONTENT))).toEqual([]);
    expect(stale(found, OPEN_GUARDED, fieldsOf(OPEN_CONTENT))).toEqual([]);
  });

  test("every guarded tool has a failing answer in this test", () => {
    const k7 = Object.keys(GUARDED).sort();
    expect(Object.keys(FAILING).sort()).toEqual(k7);
  });

  for (const actionId of Object.keys(GUARDED)) {
    test(`${actionId}: a failed run shows no service text`, () => {
      expectNoLeak(output(actionId, FAILING[actionId]));
    });

    test(`${actionId}: the canary in every unchecked text field never reaches the answer`, () => {
      const fields = textFields(actionId);
      expect(fields.length).toBeGreaterThan(0);
      const missing: string[] = [];
      const leaking: string[] = [];
      for (const field of fields) {
        const answer = structuredClone(FAILING[actionId]);
        if (!setAt(answer, field, LEAK)) { missing.push(field); continue; }
        let parsed: unknown;
        try { parsed = output(actionId, answer); } catch { continue; } // refused answer: nothing reaches the client
        if (FOREIGN.some((fragment) => JSON.stringify(parsed).includes(fragment))) leaking.push(field);
      }
      expect(missing).toEqual([]);
      expect(leaking).toEqual([]);
    });
  }

  test("automation runs: only a succeeded run keeps its text, reasons are known codes", () => {
    const runs = output("cai.club.19.automation_runs", {
      items: [
        failedRun,
        { ...failedRun, state: "succeeded", reason: null, result_text: "3 Termine in der Vorschau", delivery_state: "delivered" },
        { ...failedRun, state: "skipped", reason: "daily_limit", result_text: null },
        { ...failedRun, state: "awaiting_approval", reason: null, result_text: LEAK, delivery_state: null },
        { ...failedRun, state: "exploded: Verein B", reason: "approval_superseded", trigger_type: "cron", delivery_state: "lost" },
      ],
    }) as { items: Array<Record<string, unknown>> };
    expect(runs.items.map((run) => [run.state, run.reason, run.result_text, run.trigger_type, run.delivery_state])).toEqual([
      ["failed", "run_failed", null, "event", "failed"],
      ["succeeded", null, "3 Termine in der Vorschau", "event", "delivered"],
      ["skipped", "daily_limit", null, "event", "failed"],
      ["awaiting_approval", null, null, "event", null],
      ["unknown", "approval_superseded", null, "unknown", "unknown"],
    ]);
    expect(runs.items[0]?.trigger_event).toEqual({
      event_type: "event.upcoming", subject_type: "event", subject_id: planId, actor_user_id: null, occurred_at: "2026-11-19T09:00:00+00:00",
    });
  });

  test("automation: a pause reason outside the known codes is reported as unknown", () => {
    const show = (changes: Record<string, unknown>) => output("cai.club.18.automation_show", { ...automation, ...changes }) as Record<string, unknown>;
    expect(show({}).paused_reason).toBe("unknown");
    expect(show({ paused_reason: "repeated_failures" }).paused_reason).toBe("repeated_failures");
    expect(show({ paused_reason: null }).paused_reason).toBeNull();
    expect(show({ kind: "Verein B", approval_mode: "Max Mustermann" })).toMatchObject({ kind: "unknown", approval_mode: "unknown" });
  });

  test("sync runs: a succeeded run has no error, a failed one a known code or SYNC_FAILED", () => {
    const runs = output("cai.teams.27.sync_runs", [
      failedSync,
      { ...failedSync, error: "FETCH_TIMEOUT" },
      { ...failedSync, status: "SUCCEEDED", error: "EMPTY_FEED", trigger: "SCHEDULED" },
      { ...failedSync, status: "EXPLODED", error: null, trigger: "cron" },
    ]) as Array<Record<string, unknown>>;
    expect(runs.map((run) => [run.status, run.error, run.trigger])).toEqual([
      ["FAILED", "SYNC_FAILED", "MANUAL"],
      ["FAILED", "FETCH_TIMEOUT", "MANUAL"],
      ["SUCCEEDED", null, "SCHEDULED"],
      ["unknown", null, "unknown"],
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

  test("times and ids of a report pass only in their form (review 4a8506f4)", () => {
    const run = output("cai.club.24.automation_run", {
      ...failedRun, state: "succeeded", reason: null, result_text: "ok",
      scheduled_for: "2026-11-19", started_at: "2026-11-19T10:00:00.123Z", finished_at: LEAK, created_at: "morgen",
      delivered_message_id: "msg:42",
    }) as Record<string, unknown>;
    expect([run.scheduled_for, run.started_at, run.finished_at, run.created_at, run.delivered_message_id])
      .toEqual(["2026-11-19", "2026-11-19T10:00:00.123Z", null, null, "msg:42"]);
    expect(output("cai.club.24.automation_run", { ...failedRun, delivered_message_id: LEAK })).toMatchObject({ delivered_message_id: null });
    const shown = output("cai.club.18.automation_show", { ...automation, capability_id: LEAK, next_run_at: LEAK }) as Record<string, unknown>;
    expect([shown.capability_id, shown.next_run_at]).toEqual([null, null]);
    const snapshot = (output("cai.club.12.weekly_preview_list", [{
      ...(FAILING["cai.club.12.weekly_preview_list"] as Array<Record<string, unknown>>)[0],
      range_start: LEAK, published_at: "2026-11-22T19:00:00+01:00",
    }]) as Array<Record<string, unknown>>)[0];
    expect([snapshot?.range_start, snapshot?.published_at]).toEqual([null, "2026-11-22T19:00:00+01:00"]);
  });

  test("ical preview: a warning leaves only as its kind (review 4a8506f4)", () => {
    const preview = output("cai.teams.23.ical_preview", FAILING["cai.teams.23.ical_preview"]) as Record<string, unknown>;
    expect(preview.warnings).toEqual(["UNKNOWN_COMPETITION", "COMPLEX_TIME_OR_RECURRENCE", "WARNING"]);
  });

  test("clarifications: kind and status leave only as known words (review 4a8506f4)", () => {
    const list = output("cai.teams.28.clarification_list", [
      clarification, { ...clarification, type: "POSSIBLE_DUPLICATE", status: "OPEN" },
    ]) as Array<Record<string, unknown>>;
    expect(list.map((item) => [item.type, item.status])).toEqual([["UNKNOWN", "unknown"], ["POSSIBLE_DUPLICATE", "OPEN"]]);
    const resolved = output("cai.teams.29.clarification_resolve", FAILING["cai.teams.29.clarification_resolve"]) as { clarification: Record<string, unknown> };
    expect([resolved.clarification.type, resolved.clarification.status]).toEqual(["UNKNOWN", "unknown"]);
  });

  test("external team syncs: exception texts of a run leave only as their number", async () => {
    const answers: Record<string, unknown> = {
      list: [{ id: runId, club_id: clubId, team_label: "F-Jugend", last_sync_summary: JSON.stringify({ created: 2, errors: 1 }) },
        { id: planId, club_id: clubId, team_label: "G-Jugend", last_sync_summary: LEAK }],
      show: { id: runId, club_id: clubId, team_label: "F-Jugend", last_sync_summary: JSON.stringify({ note: LEAK }) },
      run: { total_configs: 1, synced: 0, errors: [`API fetch failed: ${LEAK}`], results: [{ sync_config_id: runId, team_label: "F-Jugend", provider: "api_fussball", created: 0, updated: 0, unchanged: 0, errors: [`Booking: ${LEAK}`] }] },
      provider_run: { total_configs: 1, synced: 0, errors: [LEAK], results: [] },
    };
    const inputs: Record<string, Record<string, unknown>> = {
      list: { operation: "list", club_id: clubId },
      show: { operation: "show", club_id: clubId, sync_id: runId },
      run: { operation: "run", club_id: clubId },
      provider_run: { operation: "provider_run", club_id: clubId, provider_id: "api_fussball" },
    };
    const results: Record<string, unknown> = {};
    for (const [operation, answer] of Object.entries(answers)) {
      const client = { request: async () => structuredClone(answer) } as never;
      results[operation] = await executeK8Operation("cai.event.25.external_sync_workflows", operation, inputs[operation] as never, { club_id: clubId } as never, client);
      expectNoLeak(results[operation]);
    }
    expect(results.list).toMatchObject([{ last_sync_summary: JSON.stringify({ created: 2, errors: 1 }) }, { last_sync_summary: null }]);
    expect(results.show).toMatchObject({ last_sync_summary: null });
    expect(results.run).toMatchObject({ errors: ["SYNC_FAILED"], results: [{ team_label: "F-Jugend", errors: ["SYNC_FAILED"] }] });
    expect(results.provider_run).toMatchObject({ errors: ["SYNC_FAILED"] });
  });

  test("external team syncs: string errors, provider, extra fields and summary keys carry no service text (review 4a8506f4)", async () => {
    const run = async (operation: string, answer: unknown, input: Record<string, unknown> = {}) => {
      const client = { request: async () => structuredClone(answer) } as never;
      const result = await executeK8Operation("cai.event.25.external_sync_workflows", operation,
        { operation, club_id: clubId, ...input } as never, { club_id: clubId } as never, client);
      expectNoLeak(result);
      return result;
    };
    // errors as one string instead of a list, unknown provider, extra fields at both levels
    expect(await run("run", {
      total_configs: 1, synced: 0, errors: `API fetch failed: ${LEAK}`, debug: LEAK,
      results: [{ sync_config_id: LEAK, team_label: "F-Jugend", provider: LEAK, created: "3", updated: 0, unchanged: 0, errors: LEAK, trace: LEAK }],
    })).toEqual({
      total_configs: 1, synced: 0, errors: ["SYNC_FAILED"],
      results: [{ sync_config_id: null, team_label: "F-Jugend", provider: "unknown", created: null, updated: 0, unchanged: 0, errors: ["SYNC_FAILED"] }],
    });
    // not an object at all
    expect(await run("run", LEAK)).toEqual({ total_configs: null, synced: null, results: [], errors: ["SYNC_FAILED"] });
    // a service text as key of the summary, or a counter that is not a number
    const config = (summary: string) => ({ id: runId, club_id: clubId, team_label: "F-Jugend", provider: "api_fussball", last_sync_summary: summary });
    expect(await run("show", config(JSON.stringify({ created: 1, [LEAK]: 1 })), { sync_id: runId })).toMatchObject({ last_sync_summary: null });
    expect(await run("show", config(JSON.stringify({ created: LEAK })), { sync_id: runId })).toMatchObject({ last_sync_summary: null });
    expect(await run("list", [{ ...config(JSON.stringify({ errors: 2 })), provider: LEAK }])).toMatchObject([{ provider: "unknown", last_sync_summary: JSON.stringify({ errors: 2 }) }]);
  });

  test("the job status tool reports only typed states and codes", () => {
    const schema = z.toJSONSchema(ASYNC_JOB_HANDLE_SCHEMA) as JsonSchemaNode;
    // The font upload result names the file and family the person uploaded — their own input.
    const reviewed = new Set(["$.result.filename", "$.result.family"]);
    const texts: string[] = [];
    walk(schema, "", (node, path, key) => { if (key !== null && isText(node) && !reviewed.has(path)) texts.push(path); });
    expect(texts).toEqual([]);
  });

  test("the published output schema is unchanged by the guard", () => {
    const row = contracts.find((contract) => contract.action_id === "cai.club.19.automation_runs");
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
