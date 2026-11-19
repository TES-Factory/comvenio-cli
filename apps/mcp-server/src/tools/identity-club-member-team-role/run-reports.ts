/**
 * Public form of run and history reports (BUG 7b331d46).
 *
 * A run report of a service may carry free text: the reason of a failed automation run,
 * its result text, the error of a calendar sync, the error message of a weekly preview
 * run. Only a run that succeeded keeps its text. A state, reason or error passes only as
 * one of the known words of its service; anything else becomes a fixed code. The full
 * reason stays at the run in Web or App — the same rule as the agent function runs
 * (runtime-tools.ts, registerAgentFunctionTools; reviews b729144d, f5c3a812).
 *
 * The guards are applied with zod `.overwrite`, so the output schemas — and the published
 * JSON Schema and its contract hash — stay as they are; `output.parse` in the tool set is
 * the one place every answer (MCP text, structuredContent, CLI) passes.
 */

type Report = Record<string, unknown>;

/** ai-service models/automation.py RUN_STATES. */
export const AUTOMATION_RUN_STATES: ReadonlySet<string> = new Set([
  "queued", "running", "succeeded", "failed", "skipped", "awaiting_approval", "approved", "rejected",
]);

/**
 * The codes ai-service writes itself into automation_runs.reason (services/automations:
 * runner, approval, delivery, events, club_executors). A reason taken over from a function
 * run or an exception is not among them and leaves as a fixed code.
 */
export const AUTOMATION_RUN_REASONS: ReadonlySet<string> = new Set([
  // skipped
  "approval_superseded", "approval_expired", "objected", "actor_lost_permission", "daily_limit",
  "function_unavailable", "function_changed", "missed_window",
  // failed
  "execution_failed", "execution_interrupted", "follow_up_failed", "release_not_current",
  "actor_token_missing", "permissions_unavailable", "bundle_all_failed", "bundle_result_missing",
  "source_unavailable", "source_incomplete", "department_missing", "department_unresolved",
  "department_outside_area",
  // delivery
  "missing_channel", "missing_recipient", "notify_unreachable", "notify_in_progress",
]);

/** ai-service models/automation.py PAUSE_REASONS. */
export const AUTOMATION_PAUSE_REASONS: ReadonlySet<string> = new Set([
  "repeated_failures", "actor_lost_permission", "function_unavailable", "migrated_paused", "manual",
]);

/** event-service models/external_team_sync.py CalendarSyncRunStatus and CalendarSubscriptionStatus. */
export const SYNC_RUN_STATUSES: ReadonlySet<string> = new Set(["RUNNING", "SUCCEEDED", "FAILED"]);
export const SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(["INACTIVE", "VALIDATED", "ACTIVE"]);

/**
 * The codes event-service writes into calendar_sync_runs.error_code and
 * subscriptions.last_error_code (utils/calendar_sync.py, routes/team_season_calendar.py).
 */
export const SYNC_ERROR_CODES: ReadonlySet<string> = new Set([
  "STALE_TIMEOUT", "SOURCE_CHANGED", "EMPTY_FEED", "INTERNAL_ERROR",
  "ICALURLERROR", "ICALFETCHTIMEOUT", "ICALFETCHERROR", "VALUEERROR",
  "URL_REJECTED", "FETCH_TIMEOUT", "FETCH_FAILED", "PARSE_FAILED",
]);

/** ai-service agent_plan_runs.status as the weekly preview route reports it. */
export const PLAN_RUN_STATUSES: ReadonlySet<string> = new Set([
  "pending", "queued", "running", "waiting", "awaiting_approval", "completed", "failed",
]);

/** ai-service services/club_agent/weekly_preview.py: why an event stays out of the preview. */
export const WEEKLY_PREVIEW_HIDDEN_REASONS: ReadonlySet<string> = new Set(["cancelled", "not_public"]);

export const RUN_FAILED = "run_failed";
export const SYNC_FAILED = "SYNC_FAILED";
export const UNKNOWN = "unknown";

function known(value: unknown, words: ReadonlySet<string>, fallback: string): unknown {
  if (value === null || value === undefined) return value;
  return typeof value === "string" && words.has(value) ? value : fallback;
}

/** Writes only keys the service sent: an absent field stays absent. */
function assign(report: Report, key: string, value: unknown): void {
  if (Object.hasOwn(report, key)) report[key] = value;
}

export function publicAutomationRun<T>(run: T): T {
  const report = { ...(run as Report) };
  const state = known(report.state, AUTOMATION_RUN_STATES, UNKNOWN);
  assign(report, "state", state);
  assign(report, "reason", known(report.reason, AUTOMATION_RUN_REASONS, state === "failed" ? RUN_FAILED : UNKNOWN));
  assign(report, "result_text", state === "succeeded" ? report.result_text : null);
  return report as T;
}

export function publicAutomation<T>(automation: T): T {
  const report = { ...(automation as Report) };
  assign(report, "paused_reason", known(report.paused_reason, AUTOMATION_PAUSE_REASONS, UNKNOWN));
  // last_run is guarded by its own schema (publicAutomationRun).
  return report as T;
}

export function publicSyncRun<T>(run: T): T {
  const report = { ...(run as Report) };
  const status = known(report.status, SYNC_RUN_STATUSES, UNKNOWN);
  assign(report, "status", status);
  assign(report, "error", status === "SUCCEEDED" || report.error == null ? null : known(report.error, SYNC_ERROR_CODES, SYNC_FAILED));
  return report as T;
}

export function publicCalendarSubscription<T>(subscription: T): T {
  const report = { ...(subscription as Report) };
  assign(report, "status", known(report.status, SUBSCRIPTION_STATUSES, UNKNOWN));
  assign(report, "last_error", known(report.last_error, SYNC_ERROR_CODES, SYNC_FAILED));
  // latest_run is guarded by its own schema (publicSyncRun).
  return report as T;
}

export function publicWeeklyPreviewRun<T>(run: T): T {
  const report = { ...(run as Report) };
  const status = known(report.status, PLAN_RUN_STATUSES, UNKNOWN);
  assign(report, "status", status);
  assign(report, "error", report.error != null || status === "failed" ? RUN_FAILED : report.error);
  return report as T;
}

export function publicWeeklyPreviewEntry<T>(entry: T): T {
  const report = { ...(entry as Report) };
  assign(report, "reason", known(report.reason, WEEKLY_PREVIEW_HIDDEN_REASONS, "hidden"));
  return report as T;
}
