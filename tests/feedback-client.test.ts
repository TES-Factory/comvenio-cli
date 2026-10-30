import { expect, test } from "bun:test";

import { detectAgent, withFeedbackClient } from "../src/commands/feedback-client.ts";

// Task 15c9ab96: feedback entered through the CLI names the agent and the CLI version.
test("detectAgent prefers COMVENIO_AGENT, then AI_AGENT, then CLAUDECODE", () => {
  expect(detectAgent({ COMVENIO_AGENT: "codex", AI_AGENT: "claude-code_2-1-314_agent" })).toBe("codex");
  expect(detectAgent({ AI_AGENT: "claude-code_2-1-314_agent" })).toBe("claude-code_2-1-314_agent");
  expect(detectAgent({ CLAUDECODE: "1" })).toBe("claude-code");
  expect(detectAgent({})).toBeUndefined();
});

test("withFeedbackClient adds agent and version only to feedback create", () => {
  const input = { feedback: { kind: "ERROR", message: "x" } };
  expect(withFeedbackClient("cai.feedback.01.create", input, { AI_AGENT: "claude-code_2-1-314_agent" }, "0.1.0+test"))
    .toEqual({ ...input, client: { agent: "claude-code_2-1-314_agent", version: "0.1.0+test" } });
  expect(withFeedbackClient("cai.feedback.01.create", input, {}, "0.1.0+test").client).toEqual({ agent: "unbekannt", version: "0.1.0+test" });
  expect(withFeedbackClient("cai.feedback.02.list", input, { AI_AGENT: "a" }, "v")).toBe(input);
  const own = { ...input, client: { agent: "eigener" } };
  expect(withFeedbackClient("cai.feedback.01.create", own, { AI_AGENT: "a" }, "v")).toBe(own);
});
