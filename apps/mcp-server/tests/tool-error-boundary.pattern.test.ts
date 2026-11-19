import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { createConnectorError, type CapabilitySnapshot, type RequestContext } from "@comvenio/connector-contracts";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { InMemoryDomainStateStore } from "../src/domain-state-store.ts";
import type { StatelessTransportContext } from "../src/http/types.ts";
import { createRuntimeServer } from "../src/runtime-tools.ts";
import { guardToolErrors } from "../src/tool-error-boundary.ts";

// BUG b1c53c74: a tool that threw reached the SDK fallback, which published
// error.message — and the client builds it from the whole service detail. Every
// tool error must pass the reviewed boundary (publicToolError, publicDetail).
// Pattern guard for G-1183: every registered tool, also those added later.

const clubId = "31313131-3131-4313-8313-313131313131";
const subjectId = "32323232-3232-4323-8323-323232323232";
const taskId = "33333333-3333-4333-8333-333333333333";
const LEAK = "invalid_args Beleg gehört Verein B, Max Mustermann";
const FOREIGN = ["Verein B", "Max Mustermann", "Beleg gehört"];

const context: RequestContext = {
  request_id: "34343434-3434-4343-8343-343434343434",
  surface: "mcp",
  provider: "openai",
  subject_id: subjectId,
  oauth_grant_id: "35353535-3535-4353-8353-353535353535",
  club_id: clubId,
  department_id: null,
  scopes: ["club.read", "club.write", "member.read.basic", "task.read", "task.write"],
  capability_version: "C".repeat(43),
  locale: "de-DE",
  timezone: "Europe/Berlin",
};

function snapshot(): CapabilitySnapshot {
  const now = new Date();
  return {
    subject_id: subjectId,
    member_id: "36363636-3636-4363-8363-363636363636",
    club_id: clubId,
    department_ids: [],
    permissions: { view_members: true, view_members_details: true, manage_members: true, read_news: true, view_events: true },
    sources: [],
    capability_version: "C".repeat(43),
    generated_at: now.toISOString(),
    observed_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 60_000).toISOString(),
  };
}

function runtimeServer(): McpServer {
  const transportContext: StatelessTransportContext = {
    provider_request: {
      request_id: context.request_id,
      provider: "openai",
      client_kind: "chatgpt",
      authenticated: true,
      protocol_version: null,
      received_at: new Date().toISOString(),
    },
    request: context,
    capability_snapshot: snapshot(),
    backend_actor_token: "backend-actor-token-0123456789",
    risk: "read",
  };
  return createRuntimeServer({
    environment: "development",
    api_base_url: "https://api.example.test",
    public_origin: "https://mcpdev.comvenio.app",
    context: transportContext,
    domain_state_store: new InMemoryDomainStateStore(),
    release_scope: "full_connector_v1",
    club_agent_functions: [{
      capability_id: "club.faq.answer",
      title: "Vereins-FAQ beantworten",
      description: "Beantwortet eine Frage aus der Vereins-FAQ.",
      risk_level: 0,
      approval_required: false,
      input_schema: {
        type: "object",
        properties: { question: { type: "string", minLength: 1, maxLength: 500 } },
        required: ["question"],
        additionalProperties: false,
      },
      capability_version: 1,
      input_schema_hash: "sha256:a",
    }],
  });
}

async function connect(server: McpServer): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return client;
}

function expectNoForeignText(result: unknown): void {
  const serialized = JSON.stringify(result);
  for (const text of FOREIGN) expect(serialized).not.toContain(text);
}

const realFetch = globalThis.fetch;

describe("Werkzeugfehler über die geprüfte Grenze (BUG b1c53c74)", () => {
  beforeEach(() => {
    // Every service answers a refused input whose detail carries free text after a reviewed code.
    globalThis.fetch = (async () => Response.json({ detail: LEAK }, { status: 422 })) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("die drei Werkzeuge aus dem Befund: Grund nur als geprüfter Code, in MCP-Text und structuredContent", async () => {
    const server = runtimeServer();
    const names = Object.keys((server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools);
    expect(names).toEqual(expect.arrayContaining(["cv_my_tasks_read", "cv_my_task_reminder_write", "public_club_by_domain"]));
    // No listTools on this client: the SDK client would check an error's structuredContent
    // against the output schema; the CLI reads it raw, like the domain tools answer today.
    const client = await connect(server);
    try {
      for (const [name, args] of [
        ["cv_my_tasks_read", { from: "2026-08-03T00:00:00.000Z", to: "2026-08-10T00:00:00.000Z" }],
        ["cv_my_task_reminder_write", { operation: "list", task_id: taskId }],
        ["public_club_by_domain", { domain: "verein.example.de" }],
      ] as const) {
        const result = await client.callTool({ name, arguments: args });
        expect(result.isError).toBe(true);
        expectNoForeignText(result);
        expect(result.structuredContent).toMatchObject({ code: "VALIDATION_FAILED", detail: "invalid_args" });
        expect((result.content as { text: string }[])[0]!.text).toContain("\nGrund: invalid_args\n");
      }
    } finally {
      await client.close();
    }
  });

  test("Muster: kein registriertes Werkzeug wirft einen Fehler roh an das SDK", async () => {
    const server = runtimeServer();
    const tools = (server as unknown as { _registeredTools: Record<string, { handler: (...args: unknown[]) => unknown }> })._registeredTools;
    const names = Object.keys(tools);
    expect(names.length).toBeGreaterThan(20);
    for (const name of names) {
      // Arguments the handler does not expect: whatever fails inside must still answer, never throw.
      const outcome = await Promise.resolve()
        .then(() => tools[name]!.handler({}, { signal: new AbortController().signal, requestId: 1, sendNotification: async () => {}, sendRequest: async () => ({}) }))
        .then((result) => ({ result }), (error: unknown) => ({ thrown: error }));
      expect({ name, thrown: "thrown" in outcome }).toEqual({ name, thrown: false });
      expectNoForeignText((outcome as { result: unknown }).result);
    }
  });

  test("ein fehlgeschlagener Lauf einer Agent-Funktion trägt keinen freien Dienst-Text (Prüfung b729144d)", async () => {
    globalThis.fetch = (async () => Response.json({ id: taskId, state: "failed", error: LEAK, result_summary: LEAK })) as unknown as typeof fetch;
    const client = await connect(runtimeServer());
    try {
      const result = await client.callTool({ name: "cv_fn_club_faq_answer", arguments: { question: "Wo ist die Satzung?" } });
      expectNoForeignText(result);
      expect(result.structuredContent).toMatchObject({ state: "failed", error: "run_failed", result_summary: null });
      expect((result.content as { text: string }[])[0]!.text).toContain("am Lauf in Web oder App");
    } finally {
      await client.close();
    }
  });

  test("list der Erinnerungen liest nur: ein unbeantwortetes list ist kein unbekannter Schreibvorgang (Prüfung b729144d)", async () => {
    globalThis.fetch = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    const client = await connect(runtimeServer());
    try {
      const list = await client.callTool({ name: "cv_my_task_reminder_write", arguments: { operation: "list", task_id: taskId } });
      expect(list.isError).toBe(true);
      expect((list.structuredContent as { code: string }).code).not.toBe("OUTCOME_UNKNOWN");
      const set = await client.callTool({ name: "cv_my_task_reminder_write", arguments: { operation: "delete", task_id: taskId } });
      expect((set.structuredContent as { code: string }).code).toBe("OUTCOME_UNKNOWN");
    } finally {
      await client.close();
    }
  });

  test("der Rückfall des SDK nennt nur den eigenen Aufruf; eine ungültige Ausgabe wird UNKNOWN_ERROR (Prüfung b729144d)", async () => {
    const server = new McpServer({ name: "probe", version: "1.0.0" });
    guardToolErrors(server, { context, public_origin: "https://mcpdev.comvenio.app" });
    registerAppTool(server, "probe_read", {
      title: "Probe",
      description: "Probe",
      inputSchema: z.object({ count: z.number().int() }).strict(),
      outputSchema: z.object({ ok: z.boolean() }).strict(),
      annotations: { readOnlyHint: true },
      _meta: {},
    }, async () => ({ content: [{ type: "text", text: "x" }], structuredContent: { ok: true, mitglied_max_mustermann: "Verein B" } }));
    const client = await connect(server);
    try {
      const invalidOutput = await client.callTool({ name: "probe_read", arguments: { count: 1 } });
      expect(invalidOutput.isError).toBe(true);
      expectNoForeignText(invalidOutput);
      expect(JSON.stringify(invalidOutput)).not.toContain("mitglied_max_mustermann");
      expect(invalidOutput.structuredContent).toMatchObject({ code: "UNKNOWN_ERROR", request_id: context.request_id });
      // The input check repeats only the caller's own call; the CLI reads its field from it (K16).
      const invalidInput = await client.callTool({ name: "probe_read", arguments: { count: "eins" } });
      expect((invalidInput.content as { text: string }[])[0]!.text).toStartWith("MCP error -32602: Input validation error");
    } finally {
      await client.close();
    }
  });

  test("guardToolErrors fängt einen geworfenen ConnectorError und gibt die öffentliche Form", async () => {
    const server = new McpServer({ name: "probe", version: "1.0.0" });
    guardToolErrors(server, { context, public_origin: "https://mcpdev.comvenio.app" });
    registerAppTool(server, "probe_write", {
      title: "Probe",
      description: "Probe",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: false },
      _meta: {},
    }, async () => {
      throw createConnectorError({
        code: "VALIDATION_FAILED",
        message: `Der Comvenio-Dienst hat die Anfrage abgelehnt: ${LEAK}`,
        request_id: context.request_id,
        retryable: false,
        detail: LEAK,
      });
    });
    const client = await connect(server);
    try {
      const result = await client.callTool({ name: "probe_write", arguments: {} });
      expect(result.isError).toBe(true);
      expectNoForeignText(result);
      expect(result.structuredContent).toMatchObject({ code: "VALIDATION_FAILED", detail: "invalid_args", request_id: context.request_id });
    } finally {
      await client.close();
    }
  });
});
