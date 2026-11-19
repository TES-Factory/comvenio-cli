import type { RequestContext } from "@comvenio/connector-contracts";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { publicToolError } from "./public-tool-error.ts";

type RegisterTool = McpServer["registerTool"];
type ToolConfig = Parameters<RegisterTool>[1];
type ToolCallback = Parameters<RegisterTool>[2];

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
  const register: RegisterTool = server.registerTool.bind(server);
  const guarded = (name: string, config: ToolConfig, callback: ToolCallback) => {
    const effect = config.annotations?.readOnlyHint === true ? "read" : "write";
    const handler = async (...args: unknown[]): Promise<CallToolResult> => {
      try {
        return await (callback as (...values: unknown[]) => Promise<CallToolResult>)(...args);
      } catch (error) {
        return publicToolError(input.context, input.public_origin, error, effect);
      }
    };
    return register(name, config, handler as unknown as ToolCallback);
  };
  server.registerTool = guarded as RegisterTool;
}
