import type { RequestContext } from "@comvenio/connector-contracts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { publicToolError } from "./public-tool-error.ts";

// registerTool is overloaded; Parameters<> of an overload set does not give a usable
// config type (TS2339 on annotations). Only the hint is read, the rest passes through.
type ToolConfig = { annotations?: { readOnlyHint?: boolean } };
type ToolCallback = (...args: unknown[]) => Promise<CallToolResult> | CallToolResult;
type RegisterToolLoose = (name: string, config: ToolConfig, callback: ToolCallback) => unknown;

/**
 * Every tool of this server answers a failure through publicToolError (BUG b1c53c74).
 *
 * A callback that throws reached the SDK's fallback, which publishes
 * `error.message` as the tool text. The comvenio-client builds that message from
 * the whole `detail` of the service ("Der Comvenio-Dienst hat die Anfrage
 * abgelehnt: <detail>"), so free service text — a foreign club, a person's name —
 * passed by the reviewed boundary (cv_my_tasks_read, cv_my_task_reminder_write,
 * the public tools). Wrapping registerTool once, before any tool is registered,
 * covers every registration on this server, registerAppTool included, and every
 * tool added later. A tool that answers its errors itself is unchanged.
 */
export function guardToolErrors(server: McpServer, input: {
  context: RequestContext;
  public_origin: string;
}): void {
  const register = server.registerTool.bind(server) as unknown as RegisterToolLoose;
  const guarded: RegisterToolLoose = (name, config, callback) => {
    const effect = config.annotations?.readOnlyHint === true ? "read" : "write";
    const handler: ToolCallback = async (...args) => {
      try {
        return await callback(...args);
      } catch (error) {
        return publicToolError(input.context, input.public_origin, error, effect);
      }
    };
    return register(name, config, handler);
  };
  server.registerTool = guarded as unknown as McpServer["registerTool"];
  guardSdkFallback(server, input);
}

/**
 * The SDK's own fallback (createToolError) for what fails outside a callback:
 * input and output validation, unknown or disabled tools. Only the answers about
 * the caller's own call keep their text — the input check, which the CLI turns
 * into its field message (K16), and the tool name. Everything else, e.g. an
 * output check that names keys of the structured content, becomes the public
 * UNKNOWN_ERROR with its request ID (review b729144d).
 */
function guardSdkFallback(server: McpServer, input: { context: RequestContext; public_origin: string }): void {
  const sdk = server as unknown as { createToolError: (message: string) => CallToolResult };
  const original = sdk.createToolError.bind(server);
  sdk.createToolError = (message: string) => CALLER_OWN_SDK_ERROR.test(message)
    ? original(message)
    : publicToolError(input.context, input.public_origin, new Error("sdk fallback"), "read");
}

/** Texts of @modelcontextprotocol/sdk server/mcp.js that only repeat the caller's own call. */
const CALLER_OWN_SDK_ERROR = /^MCP error -?\d+: (?:Input validation error: |Tool \S+ (?:not found|disabled)$)/u;
