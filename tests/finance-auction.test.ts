import { expect, test } from "bun:test";
import { runAuction } from "../src/commands/finance-connector.ts";
import type { CliConnectorClient } from "../src/mcp/client.ts";

test("advance donations preserve event, original date, cent amount and retry identity", async () => {
  const key = crypto.randomUUID(), event = crypto.randomUUID();
  const calls: unknown[] = [];
  const client = { async callAction(call: unknown) { calls.push(call); return {}; } } as CliConnectorClient;
  await runAuction(client, "geldspende", {event, stand:"0", idempotencyKey:key, date:"2026-11-15", revenue:"2050"});
  expect(calls).toEqual([{action_id:"cai.finance.25.entry_correction",idempotency_key:key,
    input:{event_id:event,operation:"auction_record",data:{kind:"donation",request_id:key,expected_version:0,date:"2026-11-15",amount_cents:2050}}}]);
  await expect(runAuction(client,"sachspende",{stand:"0"})).rejects.toThrow("--event");
  await expect(runAuction(client,"zuschlag",{event})).rejects.toThrow("--stand");
});
