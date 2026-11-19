import { PUBLIC_ERROR_CATALOG } from "@comvenio/connector-contracts";
import { z } from "zod";

const PUBLIC_ERROR_CODES = Object.keys(PUBLIC_ERROR_CATALOG) as [string, ...string[]];

/**
 * The one public error form of a tool answer: publicToolError (also for what the
 * error boundary catches), insufficientScopeToolResult and the failed run of an
 * agent function all answer `isError` with this structured content.
 *
 * The SDK client (1.29) checks structuredContent against the tool's outputSchema
 * also when isError is set (BUG 4fd71f53). A tool's published outputSchema is
 * therefore the union of its success form and this error form; the server itself
 * validates only successful answers, so its own schemas stay the success form.
 */
export const PUBLIC_TOOL_ERROR_OUTPUT_SCHEMA = z.object({
  error: z.string().min(1),
  code: z.enum(PUBLIC_ERROR_CODES),
  message: z.string(),
  cause: z.string(),
  next_command: z.string().nullable(),
  help: z.string(),
  request_id: z.string().nullable(),
  required_scope: z.string().optional(),
  required_scopes: z.array(z.string()).optional(),
  detail: z.string().optional(),
}).strict();

function withoutDialect(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema: _dialect, ...rest } = schema;
  return rest;
}

/** JSON Schema of the error form, in the draft the SDK publishes tool schemas in. */
export const PUBLIC_TOOL_ERROR_OUTPUT_JSON_SCHEMA: Record<string, unknown> = withoutDialect(
  z.toJSONSchema(PUBLIC_TOOL_ERROR_OUTPUT_SCHEMA, { target: "draft-7", io: "output" }) as Record<string, unknown>,
);

/**
 * Published outputSchema of a tool: an object that is either the success form or
 * the public error form. MCP requires `type: "object"` at the top, so the union
 * is an `anyOf` below it, never a bare `anyOf`. Shared definitions of the success
 * form stay at the root, where its `$ref`s ("#/definitions/…") point.
 */
export function withPublicErrorOutput(outputSchema: Record<string, unknown>): Record<string, unknown> {
  const { $schema: dialect, definitions, $defs, ...success } = outputSchema;
  return {
    ...(dialect === undefined ? {} : { $schema: dialect }),
    type: "object",
    ...(definitions === undefined ? {} : { definitions }),
    ...($defs === undefined ? {} : { $defs }),
    anyOf: [success, structuredClone(PUBLIC_TOOL_ERROR_OUTPUT_JSON_SCHEMA)],
  };
}
