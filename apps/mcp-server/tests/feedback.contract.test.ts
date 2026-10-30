import { describe, expect, test } from "bun:test";

import { K7_ACTION_DEFINITIONS, K7_ACTION_SCHEMAS } from "../src/tools/identity-club-member-team-role/index.ts";
import { K7_ACTION_HANDLERS, feedbackContext } from "../src/tools/identity-club-member-team-role/handlers.ts";

const clubId = "11111111-1111-4111-8111-111111111111";
const feedbackId = "22222222-2222-4222-8222-222222222222";

type Handler = NonNullable<(typeof K7_ACTION_HANDLERS)["cai.feedback.01.create"]>;
type Args = Parameters<Handler>;

function fakeClient(answer: unknown) {
  const requests: Record<string, unknown>[] = [];
  const client = { request: async (request: Record<string, unknown>) => { requests.push(request); return answer; } } as unknown as Args[2];
  return { client, requests };
}

describe("Feedback to Comvenio over the CLI (cai.feedback.01/02, task 15c9ab96)", () => {
  test("create posts to the user-service and is a confirmed write", () => {
    const definition = K7_ACTION_DEFINITIONS["cai.feedback.01.create"];
    expect(definition.backend_routes[0]).toMatchObject({ method: "POST", service: "user", normalized_path_template: "/users/me/feedback" });
    expect(definition.risk_class).toBe("critical_write");
    expect(definition.confirmation).toBe("required");
    expect(definition.required_scopes).toEqual(["club.write"]);
  });

  test("list reads the own feedback and is a read", () => {
    const definition = K7_ACTION_DEFINITIONS["cai.feedback.02.list"];
    expect(definition.backend_routes[0]).toMatchObject({ method: "GET", service: "user", normalized_path_template: "/users/me/feedback" });
    expect(definition.risk_class).toBe("read");
  });

  test("create sends kind, subject, message and the context cli/<agent> <version>", async () => {
    const input = K7_ACTION_SCHEMAS["cai.feedback.01.create"].input.parse({
      club_id: clubId,
      feedback: { kind: "WISHLIST", subject: "Jahresserien per CLI", message: "Bitte Serien auf vorhandenen Vorlagen." },
      client: { agent: "claude-code_2-1-314_agent", version: "0.1.0+2026-10-30" },
    }) as Args[0];
    const { client, requests } = fakeClient({ id: feedbackId });
    await K7_ACTION_HANDLERS["cai.feedback.01.create"]!(input, { surface: "cli", club_id: clubId } as Args[1], client);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: "POST", service: "user", path: "/users/me/feedback" });
    expect(requests[0]!.body).toEqual({
      kind: "WISHLIST",
      subject: "Jahresserien per CLI",
      message: "Bitte Serien auf vorhandenen Vorlagen.",
      context: "cli/claude-code_2-1-314_agent 0.1.0+2026-10-30",
    });
  });

  test("without a client the context still names the surface", () => {
    expect(feedbackContext("cli", null)).toBe("cli/unbekannt");
    expect(feedbackContext("mcp", { agent: "codex" })).toBe("mcp/codex");
  });

  for (const feedback of [
    { kind: "LOB", message: "x" }, // unknown kind
    { kind: "ERROR", message: "" }, // empty message
    { kind: "ERROR", message: "x", subject: "s".repeat(201) }, // longer than the service allows
    { kind: "ERROR", message: "x", context: "/club/abc" }, // the context is set by the connector, not the caller
  ]) {
    test(`create refuses ${JSON.stringify(feedback).slice(0, 60)}`, () => {
      expect(() => K7_ACTION_SCHEMAS["cai.feedback.01.create"].input.parse({ club_id: clubId, feedback })).toThrow();
    });
  }

  test("list output keeps state and reply and drops the rest", () => {
    const rows = K7_ACTION_SCHEMAS["cai.feedback.02.list"].output.parse([
      { id: feedbackId, project_id: "x", kind: "WISHLIST", subject: "Jahresserien", message: "Bitte", status: "IN_ROADMAP", reply: "Kommt im November.", replied_at: "2026-10-30T10:00:00Z", created_at: "2026-10-30T09:00:00Z", attachments: [] },
    ]) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ status: "IN_ROADMAP", reply: "Kommt im November." });
    expect(rows[0]).not.toHaveProperty("project_id");
  });
});
