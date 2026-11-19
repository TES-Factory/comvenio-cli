import { describe, expect, test } from "bun:test";

import { z } from "zod";

import { fullDomainOperationContracts } from "../src/domain-runtime.ts";
import baseline from "./open-outputs.baseline.json" with { type: "json" };
import { collect, isOpen, type ContractRow } from "./support/output-schema.ts";

// BUG da6abb50 (finding 6eed3947): most domain tools of K8–K14 publish an open output
// (z.json and the like) and pass the service's answer on unchecked. Typing them is a
// feature of its own; until then this ratchet keeps the number from growing:
// 1. a node that is open and not on the frozen list makes the test red — type the output instead;
// 2. a listed node that is no longer open makes it red too — delete its entry, the list only shrinks.
// Open nodes are found exactly as in run-report-boundary.pattern.test.ts (support/output-schema.ts).

type Baseline = { anzahl: number; werkzeuge: Record<string, string[]> };
const frozen = baseline as Baseline;

function entries(map: Map<string, Set<string>> | Record<string, readonly string[]>): string[] {
  const pairs = map instanceof Map ? [...map].map(([id, paths]) => [id, [...paths]] as const) : Object.entries(map);
  return pairs.flatMap(([id, paths]) => paths.map((path) => `${id} ${path}`)).sort();
}

/** Open nodes of these contract rows, as "<action_id> <path>". */
export function openNodes(rows: readonly ContractRow[]): string[] {
  return entries(collect(rows, (node) => isOpen(node)));
}

export function ratchet(found: readonly string[], list: readonly string[]): { neu: string[]; geschlossen: string[] } {
  const listed = new Set(list);
  const open = new Set(found);
  return { neu: found.filter((entry) => !listed.has(entry)), geschlossen: list.filter((entry) => !open.has(entry)) };
}

describe("open outputs of the domain tools only shrink (BUG da6abb50)", () => {
  const found = openNodes(fullDomainOperationContracts() as ContractRow[]);
  const listed = entries(frozen.werkzeuge);

  test("no open output beyond the frozen list — type the output schema instead of adding an entry", () => {
    expect(ratchet(found, listed).neu).toEqual([]);
  });

  test("no list entry that is no longer open — delete it, the list only shrinks", () => {
    expect(ratchet(found, listed).geschlossen).toEqual([]);
  });

  test("the list states its count and is sorted", () => {
    expect(frozen.anzahl).toBe(listed.length);
    const ids = Object.keys(frozen.werkzeuge);
    expect(ids).toEqual([...ids].sort());
    for (const id of ids) expect(frozen.werkzeuge[id]).toEqual([...frozen.werkzeuge[id]!].sort());
  });

  test("the detector finds a new open output and passes a typed one", () => {
    const row = (action_id: string, schema: z.ZodType): ContractRow => ({ action_id, operation: "show", output_schema: z.toJSONSchema(schema) });
    const rows = [
      row("cai.neu.01.open", z.json()),
      row("cai.neu.02.nested", z.object({ id: z.string(), payload: z.record(z.string(), z.unknown()) })),
      row("cai.neu.03.typed", z.object({ id: z.string(), count: z.number().int() })),
    ];
    // z.json() is open at the top and as the items of its array branch.
    expect(ratchet(openNodes(rows), listed).neu).toEqual(["cai.neu.01.open $", "cai.neu.01.open []", "cai.neu.02.nested $.payload"]);
  });
});
