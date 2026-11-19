import { expect } from "bun:test";

import { createConnectorError, type RequestContext } from "@comvenio/connector-contracts";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";

import { insufficientScopeToolResult } from "../../src/oauth-tool-challenge.ts";
import { PUBLIC_TOOL_ERROR_OUTPUT_SCHEMA } from "../../src/public-error-output.ts";
import { publicToolError } from "../../src/public-tool-error.ts";

const ORIGIN = "https://mcpdev.comvenio.app";

/** Every public error form a tool answers with isError (BUG 4fd71f53). */
export function publicErrorForms(context: RequestContext): unknown[] {
  const forms = [
    publicToolError(context, ORIGIN, createConnectorError({
      code: "VALIDATION_FAILED", message: "x", request_id: context.request_id, retryable: false, detail: "invalid_args",
    }), "write"),
    publicToolError(context, ORIGIN, createConnectorError({
      code: "NOT_FOUND", message: "x", request_id: context.request_id, retryable: false,
    }), "read"),
    publicToolError(context, ORIGIN, new Error("intern"), "read"),
    insufficientScopeToolResult({ public_origin: ORIGIN, required_scopes: ["task.write"], context }),
  ].map((result) => {
    expect(result.isError).toBe(true);
    return result.structuredContent;
  });
  for (const form of forms) expect(PUBLIC_TOOL_ERROR_OUTPUT_SCHEMA.safeParse(form).success).toBe(true);
  return forms;
}

/**
 * Pattern check over a tools/list answer: each published outputSchema is an object
 * that the SDK client's own validator (AJV) passes for every public error form, and
 * that judges a foreign answer exactly as the success form alone does.
 */
export function expectOutputSchemasAdmitPublicErrors(tools: Tool[], context: RequestContext): number {
  const forms = publicErrorForms(context);
  const validator = new AjvJsonSchemaValidator();
  const withSchema = tools.filter((tool) => tool.outputSchema);
  for (const tool of withSchema) {
    expect({ name: tool.name, type: tool.outputSchema!.type }).toEqual({ name: tool.name, type: "object" });
    const validate = validator.getValidator(tool.outputSchema!);
    for (const form of forms) {
      expect({ name: tool.name, form, valid: validate(form).valid }).toEqual({ name: tool.name, form, valid: true });
    }
    const { anyOf, ...root } = tool.outputSchema as unknown as { anyOf: Record<string, unknown>[] };
    const success = validator.getValidator({ ...root, ...anyOf[0]! });
    const foreign = { mitglied: "Verein B" };
    expect({ name: tool.name, valid: validate(foreign).valid }).toEqual({ name: tool.name, valid: success(foreign).valid });
  }
  return withSchema.length;
}
