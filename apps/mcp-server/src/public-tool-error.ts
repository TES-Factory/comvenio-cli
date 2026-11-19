import {
  formatPublicError,
  isConnectorError,
  publicErrorCode,
  renderPublicError,
  type RequestContext,
} from "@comvenio/connector-contracts";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { insufficientScopeToolResult } from "./oauth-tool-challenge.ts";

/**
 * Service codes whose reason may reach the customer, each reviewed for what it
 * reveals. The automations of the ai-service (automatisierungen-07 DC-3); a new
 * code joins only after the same review.
 */
const PUBLIC_DETAIL_CODES: ReadonlySet<string> = new Set([
  "automation_changed",
  "automation_paused",
  "automation_limit_reached",
  "function_not_automatable",
  "standing_not_allowed",
  "invalid_args",
  "invalid_schedule",
  "invalid_trigger",
  // club-service club_home_publish.py, 409 on a stale base (community-hub 15 DC-3,
  // BUG 15339d90): the client turns it into the bare code (no changed/added/removed
  // rows), and cai.community.06.club_page publish only sends after assertOwnClubPage
  // tied the tab to the club of the sign-in — the code says nothing about another club.
  "tab_changed",
  // club-service community hub, 409 on a stale version (community-hub 14 DC-3, BUG 947fd9fc):
  // community_error() writes "<CODE>: <fixed text>", the client adds tab ids only as UUIDs.
  // Both answer only after the right check — require_tab_write (member club, can_edit) and
  // _require_responsible on the design — and the CLI refuses a community outside the club
  // of the sign-in (COMMUNITY_NOT_IN_CLUB) before any call; the ids are the caller's own tabs.
  "TAB_VERSION_CONFLICT",
  "DESIGN_VERSION_CONFLICT",
]);

/**
 * Codes reviewed together with the fixed text the club-service puts after
 * "<CODE>: " — community_error() in community_tab_access.py and community_pages.py,
 * the bulk conflict in community_home.py — and whether the client may add the tab
 * ids. Only they may end at ':'; every other code keeps its exact form, or free
 * text after "invalid_args:" would reach the customer (review e20d7bdd).
 */
const COLON_DETAIL_FORMS: ReadonlyMap<string, { texts: ReadonlySet<string>; tabs: boolean }> = new Map([
  ["TAB_VERSION_CONFLICT", {
    texts: new Set([
      "die Seite wurde inzwischen geändert, bitte neu laden",
      "mindestens eine Seite wurde inzwischen geändert",
    ]),
    tabs: true,
  }],
  ["DESIGN_VERSION_CONFLICT", {
    texts: new Set(["das Design wurde inzwischen geändert, bitte neu laden"]),
    tabs: false,
  }],
]);

/**
 * The named fields packages/comvenio-client/src/client.ts (detailExtras) puts
 * after a snake_case code, in its order, each value an integer or a code-like word.
 * The counts are integers only: a version or a limit is never a word (review
 * 4a98b68e, a name in "live_version: Verein_B").
 */
const DETAIL_EXTRA_FIELDS: readonly string[] = ["live_version", "limit", "paused_reason", "field"];
const DETAIL_EXTRA_INTEGER_FIELDS: ReadonlySet<string> = new Set(["live_version", "limit"]);
const DETAIL_EXTRA_VALUE = /^[A-Za-z0-9_.:-]{1,80}$/u;
/** A safe integer as detailExtras writes it (Number.isSafeInteger, review b71abf05). */
const DETAIL_EXTRA_INTEGER = /^-?(?:0|[1-9][0-9]{0,15})$/u;
const TAB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
/** The client cuts its line to 300 characters, the last three "..." (upstreamBody). */
const MAX_DETAIL_CHARS = 300;
const CUT_MARK = "...";

/** " (live_version: 4, limit: 5)" exactly as detailExtras writes it. */
function reviewedExtras(rest: string): boolean {
  if (!rest.startsWith(" (") || !rest.endsWith(")")) return false;
  let previous = -1;
  for (const part of rest.slice(2, -1).split(", ")) {
    const separator = part.indexOf(": ");
    if (separator < 0) return false;
    const field = part.slice(0, separator);
    const index = DETAIL_EXTRA_FIELDS.indexOf(field);
    const value = part.slice(separator + 2);
    const reviewed = DETAIL_EXTRA_INTEGER_FIELDS.has(field)
      ? DETAIL_EXTRA_INTEGER.test(value) && Number.isSafeInteger(Number(value))
      : DETAIL_EXTRA_VALUE.test(value);
    if (index <= previous || !reviewed) return false;
    previous = index;
  }
  return true;
}

/**
 * " (Tabs: <uuid>, …)" as the client writes it, rebuilt from the ids alone. A list
 * the client cut at 300 characters keeps its whole ids; null for anything else.
 */
function reviewedTabs(rest: string, cut: boolean): string | null {
  if (!rest.startsWith(" (Tabs: ")) return null;
  let list = rest.slice(" (Tabs: ".length);
  if (!cut && list.endsWith(")")) list = list.slice(0, -1);
  else if (cut) list = list.slice(0, -CUT_MARK.length).replace(/(?:^|, ?)[0-9a-f-]*$/iu, "");
  else return null;
  if (list === "") return "";
  const ids = list.split(", ");
  return ids.length <= 10 && ids.every((id) => TAB_ID.test(id)) ? ` (Tabs: ${ids.join(", ")})` : null;
}

/**
 * The part of the service's reason that may reach the customer: a reviewed code in
 * its reviewed form — the code, the extras of the client, for the version conflicts
 * the fixed text and the tab ids. Anything else behind a reviewed code is cut to the
 * code (BUG 8916dcef: free text after the first word reached MCP text,
 * structuredContent and the CLI); an unreviewed code gives null. The code is the
 * first word; it ends at a space or '(', for the version conflicts also at ':'.
 */
function publicDetail(detail: string): string | null {
  const word = detail.split(/[\s(]/u)[0] ?? "";
  // Longer than the client's line, or cut without its mark: not a form the client wrote.
  const cut = detail.length === MAX_DETAIL_CHARS && detail.endsWith(CUT_MARK);
  const shaped = detail.length < MAX_DETAIL_CHARS || cut;
  const colon = word.endsWith(":") ? COLON_DETAIL_FORMS.get(word.slice(0, -1)) : undefined;
  if (colon) {
    const code = word.slice(0, -1);
    const rest = detail.slice(word.length);
    const text = [...colon.texts].find((fixed) => rest === ` ${fixed}` || rest.startsWith(` ${fixed} `));
    if (text === undefined || !shaped) return code;
    const tail = rest.slice(text.length + 1);
    if (tail === "") return cut ? code : `${code}: ${text}`;
    const tabs = colon.tabs ? reviewedTabs(tail, cut) : null;
    return tabs === null ? code : `${code}: ${text}${tabs}`;
  }
  if (!PUBLIC_DETAIL_CODES.has(word)) return null;
  const rest = detail.slice(word.length);
  if (rest === "" || !shaped) return word;
  // {"code": "TAB_VERSION_CONFLICT", "tabs": […]} without a message: the client
  // writes the code and the tab ids (review 4a98b68e).
  const form = COLON_DETAIL_FORMS.get(word);
  if (form) {
    const tabs = form.tabs ? reviewedTabs(rest, cut) : null;
    return tabs ? `${word}${tabs}` : word;
  }
  return !cut && reviewedExtras(rest) ? detail : word;
}

/**
 * The customer-facing tool error: public code, cause and next command from
 * docs/fehler/katalog.json. A missing scope keeps the OAuth step-up challenge
 * so providers can re-authorize; `error` keeps the internal code for existing
 * consumers, `code` is the public one.
 */
export function publicToolError(
  context: RequestContext,
  publicOrigin: string,
  error: unknown,
  effect: "read" | "write",
): CallToolResult {
  const connectorError = isConnectorError(error) ? error : null;
  const code = connectorError ? publicErrorCode({ ...connectorError, effect }) : "UNKNOWN_ERROR";
  const requiredScopes = connectorError?.required_scopes
    ?? (connectorError?.required_scope ? [connectorError.required_scope] : []);
  const rendered = renderPublicError({
    code,
    lang: "de",
    request_id: context.request_id,
    required_scopes: requiredScopes,
    granted_scopes: context.scopes,
  });
  const publicFields = {
    code: rendered.code,
    message: rendered.message,
    cause: rendered.cause,
    next_command: rendered.next_command,
    help: rendered.help,
    request_id: context.request_id,
  };
  // The service's reason names the way forward for a conflict or a refused input
  // (automation_changed with live_version, automatisierungen-07 DC-3) — but only for
  // reviewed codes: a free service text can tell a foreign club's file from a missing
  // one (finance receipts, review R3). Refusals and unknown objects keep the catalog
  // sentence: a 404 says nothing about existence. Only the reviewed form of the
  // reason passes, never free text behind a reviewed code (BUG 8916dcef).
  const detail = connectorError?.detail
    && (connectorError.code === "CONFLICT" || connectorError.code === "VALIDATION_FAILED")
    ? publicDetail(connectorError.detail)
    : null;
  // Assistants read the article through the public help tool (05-ki-zugang).
  const assistantHint = `Hilfe: comvenio_hilfe mit operation "fehler" und code "${rendered.code}".`;
  const reason = detail ? `\nGrund: ${detail}` : "";
  const content = [{ type: "text" as const, text: `${formatPublicError(rendered)}${reason}\n${assistantHint}` }];
  if (connectorError?.code === "SCOPE_REQUIRED" && requiredScopes.length > 0) {
    return insufficientScopeToolResult({
      public_origin: publicOrigin,
      required_scopes: requiredScopes,
      context,
    });
  }
  return {
    content,
    structuredContent: {
      error: connectorError?.code.toLowerCase() ?? "upstream_unavailable",
      ...(connectorError?.required_scope ? { required_scope: connectorError.required_scope } : {}),
      ...publicFields,
      ...(detail ? { detail } : {}),
    },
    _meta: { request_id: context.request_id },
    isError: true,
  };
}
