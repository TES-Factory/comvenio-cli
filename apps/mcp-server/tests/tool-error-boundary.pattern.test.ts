import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import type { CapabilitySnapshot } from "@comvenio/auth";
import { createConnectorError, type RequestContext } from "@comvenio/connector-contracts";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { z } from "zod";

import { InMemoryDomainStateStore } from "../src/domain-state-store.ts";
import type { StatelessTransportContext } from "../src/http/types.ts";
import { insufficientScopeToolResult } from "../src/oauth-tool-challenge.ts";
import { PUBLIC_TOOL_ERROR_OUTPUT_SCHEMA } from "../src/public-error-output.ts";
import { publicToolError } from "../src/public-tool-error.ts";
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
    // Without listTools the client reads structuredContent raw, like the CLI; the SDK
    // client's schema check of an error answer is covered below (BUG 4fd71f53).
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

  test("Lauf-Kennung und Freigabelink einer Agent-Funktion nur in ihrer Form (Prüfung 4a8506f4, BUG 7b331d46)", async () => {
    const call = async (run: Record<string, unknown>) => {
      globalThis.fetch = (async () => Response.json(run)) as unknown as typeof fetch;
      const client = await connect(runtimeServer());
      try {
        const result = await client.callTool({ name: "cv_fn_club_faq_answer", arguments: { question: "Wo ist die Satzung?" } });
        expectNoForeignText(result);
        return result.structuredContent as Record<string, unknown>;
      } finally {
        await client.close();
      }
    };
    const open = { state: "awaiting_approval", result_summary: null };
    // a run id that is no UUID and links outside Comvenio, with credentials or not over https never leave
    for (const url of [
      `https://example.org/approve?${LEAK}`, `http://web.comvenio.app/approvals/${taskId}`,
      `https://user:pw@web.comvenio.app/approvals/${taskId}`, `https://comvenio.app.example.org/${LEAK}`, `javascript:${LEAK}`, LEAK,
    ]) {
      expect(await call({ ...open, id: LEAK, approval: { approval_url: url } })).toMatchObject({ run_id: null, approval_url: null });
    }
    const link = `https://web.comvenio.app/approvals/${taskId}`;
    expect(await call({ ...open, id: taskId, approval: { approval_url: link } })).toMatchObject({ run_id: taskId, approval_url: link });
  });

  test("jeder nicht erfolgreiche oder unbekannte Laufzustand trägt keine Zusammenfassung (Prüfung f5c3a812)", async () => {
    for (const state of ["cancelled", "blocked", "expired", "running", "Verein B hat abgebrochen", "max_mustermann"]) {
      globalThis.fetch = (async () => Response.json({ id: taskId, state, error: "intern", result_summary: LEAK })) as unknown as typeof fetch;
      const client = await connect(runtimeServer());
      try {
        const result = await client.callTool({ name: "cv_fn_club_faq_answer", arguments: { question: "Wo ist die Satzung?" } });
        expectNoForeignText(result);
        expect(JSON.stringify(result)).not.toContain("intern");
        expect(result.structuredContent).toMatchObject({ result_summary: null, error: "run_failed" });
        // Only a state of the ai-service is repeated (review 1d99d385).
        if (!["expired", "running"].includes(state)) expect(result.structuredContent).toMatchObject({ state: "unknown" });
      } finally {
        await client.close();
      }
    }
    // A succeeded run keeps its summary — the answer the function exists for.
    globalThis.fetch = (async () => Response.json({ id: taskId, state: "succeeded", result_summary: "Die Satzung liegt im Mitgliederbereich." })) as unknown as typeof fetch;
    const client = await connect(runtimeServer());
    try {
      const result = await client.callTool({ name: "cv_fn_club_faq_answer", arguments: { question: "Wo ist die Satzung?" } });
      expect(result.structuredContent).toMatchObject({ state: "succeeded", result_summary: "Die Satzung liegt im Mitgliederbereich.", error: null });
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

  test("ein SDK-Client mit geladener Werkzeugliste nimmt die Fehlerantwort eines Werkzeugs mit outputSchema an (BUG 4fd71f53)", async () => {
    const client = await connect(runtimeServer());
    try {
      // listTools caches the output validators; the SDK client then checks structuredContent
      // against outputSchema also when isError is set.
      const listed = await client.listTools();
      for (const name of ["cv_my_tasks_read", "cv_my_task_reminder_write"]) {
        expect(listed.tools.find((tool) => tool.name === name)?.outputSchema).toBeDefined();
      }
      for (const [name, args] of [
        ["cv_my_tasks_read", { from: "2026-08-03T00:00:00.000Z", to: "2026-08-10T00:00:00.000Z" }],
        ["cv_my_task_reminder_write", { operation: "list", task_id: taskId }],
      ] as const) {
        const result = await client.callTool({ name, arguments: args });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({ code: "VALIDATION_FAILED", request_id: context.request_id });
      }
      // The tool's own refusal (protectedToolError) answers in the same public form.
      const past = await client.callTool({
        name: "cv_my_task_reminder_write",
        arguments: { operation: "set", task_id: taskId, reminder_at: "2020-01-01T00:00:00.000Z" },
      });
      expect(past.isError).toBe(true);
      expect(past.structuredContent).toMatchObject({ code: "VALIDATION_FAILED", detail: "Der Erinnerungszeitpunkt muss in der Zukunft liegen." });
    } finally {
      await client.close();
    }
  });

  test("Muster: jedes Werkzeug mit outputSchema nimmt jede öffentliche Fehlerform an, die Erfolgsform bleibt geprüft (BUG 4fd71f53)", async () => {
    const errorForms = [
      publicToolError(context, "https://mcpdev.comvenio.app", createConnectorError({
        code: "VALIDATION_FAILED", message: "x", request_id: context.request_id, retryable: false, detail: "invalid_args",
      }), "write"),
      publicToolError(context, "https://mcpdev.comvenio.app", createConnectorError({
        code: "NOT_FOUND", message: "x", request_id: context.request_id, retryable: false,
      }), "read"),
      publicToolError(context, "https://mcpdev.comvenio.app", new Error("intern"), "read"),
      insufficientScopeToolResult({ public_origin: "https://mcpdev.comvenio.app", required_scopes: ["task.write"], context }),
    ].map((result) => {
      expect(result.isError).toBe(true);
      return result.structuredContent;
    });
    for (const form of errorForms) expect(PUBLIC_TOOL_ERROR_OUTPUT_SCHEMA.safeParse(form).success).toBe(true);

    const client = await connect(runtimeServer());
    try {
      const listed = (await client.listTools()).tools.filter((tool) => tool.outputSchema);
      // Domain tools, widgets, club agent, own tasks and reminders, action_confirm.
      expect(listed.length).toBeGreaterThan(20);
      const validator = new AjvJsonSchemaValidator();
      for (const tool of listed) {
        expect({ name: tool.name, type: tool.outputSchema!.type }).toEqual({ name: tool.name, type: "object" });
        const validate = validator.getValidator(tool.outputSchema!);
        for (const form of errorForms) {
          expect({ name: tool.name, form, valid: validate(form).valid }).toEqual({ name: tool.name, form, valid: true });
        }
        // The union opens nothing beyond the error form: a foreign answer is judged as by the success form alone.
        const { anyOf, ...root } = tool.outputSchema as unknown as { anyOf: Record<string, unknown>[] };
        const success = validator.getValidator({ ...root, ...anyOf[0]! });
        const foreign = { mitglied: "Verein B" };
        expect({ name: tool.name, valid: validate(foreign).valid }).toEqual({ name: tool.name, valid: success(foreign).valid });
      }
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
