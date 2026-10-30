import pkg from "../../package.json" with { type: "json" };
import { cliVersion } from "../build-info.ts";

/** Actions whose input carries the calling agent (task 15c9ab96). */
export const FEEDBACK_CREATE_ACTION = "cai.feedback.01.create";

/**
 * Which agent runs the CLI: COMVENIO_AGENT wins, then AI_AGENT (set by Claude Code,
 * e.g. "claude-code_2-1-314_agent"), then CLAUDECODE=1; otherwise unknown.
 */
export function detectAgent(env: NodeJS.ProcessEnv): string | undefined {
  for (const value of [env.COMVENIO_AGENT, env.AI_AGENT]) {
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 80);
  }
  return env.CLAUDECODE === "1" ? "claude-code" : undefined;
}

/** Adds { client: { agent, version } } to a feedback input, unless the caller set it. */
export function withFeedbackClient(
  actionId: string,
  input: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
  version: string = cliVersion(pkg.version),
): Record<string, unknown> {
  if (actionId !== FEEDBACK_CREATE_ACTION || Object.hasOwn(input, "client")) return input;
  const agent = detectAgent(env);
  return { ...input, client: { agent: agent ?? "unbekannt", version: version.slice(0, 80) } };
}
