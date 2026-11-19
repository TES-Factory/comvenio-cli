/**
 * Public form of run and history reports (BUG 7b331d46).
 *
 * A run report of a service may carry free text: the reason of a failed automation run,
 * its result text, the error of a calendar sync, the error message of a weekly preview
 * run, the exception texts of an external team sync. Only a run that succeeded keeps its
 * text. Every state, kind, reason or error word passes only as one of the known words of
 * its service; anything else becomes a fixed code. The full reason stays at the run in
 * Web or App — the same rule as the agent function runs (runtime-tools.ts,
 * registerAgentFunctionTools; reviews b729144d, f5c3a812).
 *
 * The K7 guards are applied with zod `.overwrite`, so the output schemas — and the
 * published JSON Schema and its contract hash — stay as they are; `output.parse` in the
 * tool set is the one place every answer (MCP text, structuredContent, CLI) passes.
 * Tools with an open output (K8) apply them in their response.
 */

type Report = Record<string, unknown>;

export const RUN_FAILED = "run_failed";
export const SYNC_FAILED = "SYNC_FAILED";
export const UNKNOWN = "unknown";

// ── ai-service: automations (models/automation.py, services/automations/*) ──

export const AUTOMATION_RUN_STATES: ReadonlySet<string> = new Set([
  "queued", "running", "succeeded", "failed", "skipped", "awaiting_approval", "approved", "rejected",
]);
export const AUTOMATION_TRIGGER_TYPES: ReadonlySet<string> = new Set(["schedule", "catch_up", "manual", "event"]);
export const AUTOMATION_DELIVERY_STATES: ReadonlySet<string> = new Set(["pending", "delivered", "failed", "not_required"]);
export const AUTOMATION_KINDS: ReadonlySet<string> = new Set(["club", "personal"]);
export const AUTOMATION_APPROVAL_MODES: ReadonlySet<string> = new Set(["click", "objection_window", "standing"]);
/** services/automations/schedule.py EVENT_LABELS and the subject kinds of events.py. */
export const AUTOMATION_EVENT_TYPES: ReadonlySet<string> = new Set([
  "task.assigned", "task.updated", "task.due_soon", "task.overdue", "event.readiness", "event.public_comms",
  "event.upcoming", "meeting.agenda", "meeting.followup",
]);
export const AUTOMATION_SUBJECT_TYPES: ReadonlySet<string> = new Set(["task", "event", "meeting"]);

/**
 * The codes ai-service writes itself into automation_runs.reason (runner, approval,
 * delivery, events, club_executors). A reason taken over from a function run or an
 * exception is not among them and leaves as a fixed code.
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
export const AUTOMATION_PAUSE_REASONS: ReadonlySet<string> = new Set([
  "repeated_failures", "actor_lost_permission", "function_unavailable", "migrated_paused", "manual",
]);

// ── event-service: calendar subscriptions (models/external_team_sync.py, utils/calendar_sync.py) ──

export const SYNC_RUN_STATUSES: ReadonlySet<string> = new Set(["RUNNING", "SUCCEEDED", "FAILED"]);
export const SYNC_TRIGGERS: ReadonlySet<string> = new Set(["SCHEDULED", "MANUAL"]);
export const SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set(["INACTIVE", "VALIDATED", "ACTIVE"]);
/** calendar_sync_runs.error_code and subscriptions.last_error_code (also routes/team_season_calendar.py). */
export const SYNC_ERROR_CODES: ReadonlySet<string> = new Set([
  "STALE_TIMEOUT", "SOURCE_CHANGED", "EMPTY_FEED", "INTERNAL_ERROR",
  "ICALURLERROR", "ICALFETCHTIMEOUT", "ICALFETCHERROR", "VALUEERROR",
  "URL_REJECTED", "FETCH_TIMEOUT", "FETCH_FAILED", "PARSE_FAILED",
]);

// ── ai-service: weekly preview and club agent runs ──

/** agent_plan_runs.status as the weekly preview route reports it. */
export const PLAN_RUN_STATUSES: ReadonlySet<string> = new Set([
  "pending", "queued", "running", "waiting", "awaiting_approval", "completed", "failed",
]);
/** services/club_agent/weekly_preview.py: why an event stays out of the preview. */
export const WEEKLY_PREVIEW_HIDDEN_REASONS: ReadonlySet<string> = new Set(["cancelled", "not_public"]);
/** services/club_agent/run_refs.py record_run_ref kinds. */
export const AGENT_RUN_REF_KINDS: ReadonlySet<string> = new Set(["plan_run", "command_run", "function_run"]);
/** Statuses of plan, command and function runs a chat turn can name. */
export const AGENT_RUN_REF_STATES: ReadonlySet<string> = new Set([
  "draft", "pending", "queued", "running", "waiting", "awaiting_approval", "awaiting_followup",
  "completed", "succeeded", "failed", "cancelled", "rejected", "expired",
]);
/** agent_approval_requests.state. */
export const AGENT_APPROVAL_STATES: ReadonlySet<string> = new Set(["open", "approved", "rejected", "expired", "superseded"]);

/** event-service SyncClarification kinds and statuses (models/external_team_sync.py, calendar_sync.py). */
export const CLARIFICATION_TYPES: ReadonlySet<string> = new Set([
  "UNKNOWN_COMPETITION", "AMBIGUOUS_HOME_ROLE", "POSSIBLE_DUPLICATE", "RESOURCE_CONFLICT", "MISSING_FROM_FEED",
]);
export const CLARIFICATION_STATUSES: ReadonlySet<string> = new Set(["OPEN", "RESOLVED", "DISMISSED"]);
/** event-service ExternalSyncProvider. */
export const EXTERNAL_SYNC_PROVIDERS: ReadonlySet<string> = new Set(["api_fussball", "nuliga_tennis"]);
/** utils/external_match_sync.py last_sync_summary counters. */
const SYNC_SUMMARY_KEYS: ReadonlySet<string> = new Set(["created", "updated", "unchanged", "errors"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
/** A date or an ISO instant as the services serialise them; nothing else. */
const INSTANT = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}([.,]\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?)?$/u;
/** Identifiers that are not UUIDs (message ids, feed event ids, capability ids). */
const TOKEN = /^[A-Za-z0-9_.:-]{1,120}$/u;

function shaped(value: unknown, pattern: RegExp): unknown {
  if (value === null || value === undefined) return value;
  return typeof value === "string" && pattern.test(value) ? value : null;
}

/**
 * An approval link leaves only as an https link into Comvenio without credentials;
 * the agent function and the chat turn build it, never the client (D-AF-16).
 */
export function publicApprovalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !URL.canParse(value)) return null;
  const url = new URL(value);
  const comvenio = url.hostname === "comvenio.app" || url.hostname.endsWith(".comvenio.app");
  return url.protocol === "https:" && comvenio && url.username === "" && url.password === "" ? url.toString() : null;
}

/** A run id leaves only as a UUID. */
export function publicRunId(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function known(value: unknown, words: ReadonlySet<string>, fallback: string): unknown {
  if (value === null || value === undefined) return value;
  return typeof value === "string" && words.has(value) ? value : fallback;
}

/** Writes only keys the service sent: an absent field stays absent. */
function assign(report: Report, key: string, value: unknown): void {
  if (Object.hasOwn(report, key)) report[key] = value;
}

function isRecord(value: unknown): value is Report {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assignShaped(report: Report, keys: readonly string[], pattern: RegExp): void {
  for (const key of keys) assign(report, key, shaped(report[key], pattern));
}

/** Event that started an automation run: only known kinds, ids and the time; the dedupe key stays inside. */
export function publicTriggerEvent(event: unknown): unknown {
  if (!isRecord(event)) return event;
  const shape = (value: unknown, pattern: RegExp) => (typeof value === "string" && pattern.test(value) ? value : null);
  const output: Report = {};
  if (Object.hasOwn(event, "event_type")) output.event_type = known(event.event_type, AUTOMATION_EVENT_TYPES, UNKNOWN);
  if (Object.hasOwn(event, "subject_type")) output.subject_type = known(event.subject_type, AUTOMATION_SUBJECT_TYPES, UNKNOWN);
  if (Object.hasOwn(event, "subject_id")) output.subject_id = shape(event.subject_id, UUID);
  if (Object.hasOwn(event, "actor_user_id")) output.actor_user_id = shape(event.actor_user_id, UUID);
  if (Object.hasOwn(event, "occurred_at")) output.occurred_at = shape(event.occurred_at, INSTANT);
  return output;
}

export function publicAutomationRun<T>(run: T): T {
  const report = { ...(run as Report) };
  const state = known(report.state, AUTOMATION_RUN_STATES, UNKNOWN);
  assign(report, "state", state);
  assign(report, "trigger_type", known(report.trigger_type, AUTOMATION_TRIGGER_TYPES, UNKNOWN));
  assign(report, "delivery_state", known(report.delivery_state, AUTOMATION_DELIVERY_STATES, UNKNOWN));
  assign(report, "reason", known(report.reason, AUTOMATION_RUN_REASONS, state === "failed" ? RUN_FAILED : UNKNOWN));
  assign(report, "result_text", state === "succeeded" ? report.result_text : null);
  assign(report, "trigger_event", publicTriggerEvent(report.trigger_event));
  assignShaped(report, ["scheduled_for", "started_at", "finished_at", "created_at"], INSTANT);
  assignShaped(report, ["delivered_message_id"], TOKEN);
  return report as T;
}

export function publicAutomation<T>(automation: T): T {
  const report = { ...(automation as Report) };
  assign(report, "kind", known(report.kind, AUTOMATION_KINDS, UNKNOWN));
  assign(report, "approval_mode", known(report.approval_mode, AUTOMATION_APPROVAL_MODES, UNKNOWN));
  assign(report, "paused_reason", known(report.paused_reason, AUTOMATION_PAUSE_REASONS, UNKNOWN));
  assignShaped(report, ["next_run_at", "last_run_at", "created_at", "updated_at"], INSTANT);
  assignShaped(report, ["capability_id"], TOKEN);
  // last_run is guarded by its own schema (publicAutomationRun).
  return report as T;
}

export function publicSyncRun<T>(run: T): T {
  const report = { ...(run as Report) };
  const status = known(report.status, SYNC_RUN_STATUSES, UNKNOWN);
  assign(report, "status", status);
  assign(report, "trigger", known(report.trigger, SYNC_TRIGGERS, UNKNOWN));
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
  assignShaped(report, ["start_time", "end_time"], INSTANT);
  assignShaped(report, ["event_id"], TOKEN);
  return report as T;
}

export function publicWeeklyPreviewSnapshot<T>(snapshot: T): T {
  const report = { ...(snapshot as Report) };
  assignShaped(report, ["range_start", "range_end", "publish_at", "published_at", "created_at"], INSTANT);
  return report as T;
}

/** A clarification of the season sync: kind and status as known words; title and reason are fixed sentences of the service. */
export function publicClarification<T>(clarification: T): T {
  const report = { ...(clarification as Report) };
  assign(report, "type", known(report.type, CLARIFICATION_TYPES, "UNKNOWN"));
  assign(report, "status", known(report.status, CLARIFICATION_STATUSES, UNKNOWN));
  return report as T;
}

/** utils/ical_parse.py warnings name a feed UID in a fixed sentence; only their kind passes. */
export function publicActivationPreview<T>(preview: T): T {
  const report = { ...(preview as Report) };
  if (Array.isArray(report.warnings)) {
    report.warnings = report.warnings.map((warning) =>
      typeof warning === "string" && warning.startsWith("Nicht zuordenbarer Wettbewerb") ? "UNKNOWN_COMPETITION"
        : typeof warning === "string" && warning.startsWith("Klärungsfall") ? "COMPLEX_TIME_OR_RECURRENCE"
          : "WARNING");
  }
  return report as T;
}

export function publicAgentRunRef<T>(ref: T): T {
  const report = { ...(ref as Report) };
  assign(report, "kind", known(report.kind, AGENT_RUN_REF_KINDS, UNKNOWN));
  assign(report, "state", known(report.state, AGENT_RUN_REF_STATES, UNKNOWN));
  return report as T;
}

export function publicAgentApprovalRef<T>(ref: T): T {
  const report = { ...(ref as Report) };
  assign(report, "state", known(report.state, AGENT_APPROVAL_STATES, UNKNOWN));
  if (Object.hasOwn(report, "approval_url")) {
    const url = publicApprovalUrl(report.approval_url);
    if (url === null) delete report.approval_url; // optional in the schema: an unchecked link is left out
    else report.approval_url = url;
  }
  return report as T;
}

// ── event-service: external team syncs (routes/external_team_sync.py, utils/external_match_sync.py) ──

/** Error lists of a sync run carry exception texts (f"API fetch failed: {e}"): only their number passes. */
function errorCodes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(() => SYNC_FAILED);
  return typeof value === "string" && value !== "" ? [SYNC_FAILED] : [];
}

function count(value: unknown): number | null {
  return Number.isInteger(value) ? value as number : null;
}

/** last_sync_summary is JSON of the four counters; anything else is not reported. */
function syncSummary(value: unknown): unknown {
  if (typeof value !== "string") return value === undefined ? value : null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return null;
    const entries = Object.entries(parsed);
    const valid = entries.every(([key, counter]) => SYNC_SUMMARY_KEYS.has(key) && Number.isInteger(counter));
    return valid ? JSON.stringify(Object.fromEntries(entries)) : null;
  } catch {
    return null;
  }
}

/** A team sync configuration is the club's own setting; provider and last summary are guarded. */
export function publicExternalSyncConfig<T>(config: T): T {
  if (Array.isArray(config)) return config.map((entry) => publicExternalSyncConfig(entry)) as T;
  if (!isRecord(config)) return config;
  const report: Report = { ...config };
  assign(report, "provider", known(report.provider, EXTERNAL_SYNC_PROVIDERS, UNKNOWN));
  assign(report, "last_sync_summary", syncSummary(report.last_sync_summary));
  return report as T;
}

/** A sync run answer (SyncAllResult) leaves as a fixed projection; unknown fields stay inside. */
export function publicExternalSyncResult<T>(result: T): T {
  if (!isRecord(result)) return { total_configs: null, synced: null, results: [], errors: [SYNC_FAILED] } as T;
  const results = Array.isArray(result.results) ? result.results.filter(isRecord) : [];
  return {
    total_configs: count(result.total_configs),
    synced: count(result.synced),
    results: results.map((team) => ({
      sync_config_id: publicRunId(team.sync_config_id),
      team_label: typeof team.team_label === "string" ? team.team_label : null, // the club's own team name
      provider: known(team.provider, EXTERNAL_SYNC_PROVIDERS, UNKNOWN) ?? null,
      created: count(team.created),
      updated: count(team.updated),
      unchanged: count(team.unchanged),
      errors: errorCodes(team.errors),
    })),
    errors: errorCodes(result.errors),
  } as T;
}
