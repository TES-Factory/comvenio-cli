import { expect, test } from "bun:test";
import { impactFor } from "../src/domain-runtime.ts";

// BUG b956d7dd: the preview of materialize_next said deletes=1/creates=0 because the source action
// lists every operation of cai.event.08, "delete" included. Only the current operation counts.
const series = { source_action: "series list|show|create|update|delete|materialize|next|promote-recurring|promote-yearly" };

test("materialize and materialize_next create, they never delete", () => {
  for (const operation of ["materialize", "materialize_next"]) {
    expect(impactFor(series, { operation })).toMatchObject({ creates: 1, deletes: 0, affected_total: 1 });
  }
});

test("each operation of a listed action keeps its own effect", () => {
  expect(impactFor(series, { operation: "delete" })).toMatchObject({ deletes: 1, creates: 0 });
  expect(impactFor(series, { operation: "create" })).toMatchObject({ creates: 1, deletes: 0 });
  expect(impactFor(series, { operation: "update" })).toMatchObject({ updates: 1, deletes: 0 });
});

test("a generic operation still takes its meaning from the source action", () => {
  expect(impactFor({ source_action: "department add" }, { operation: "execute" })).toMatchObject({ creates: 1 });
  expect(impactFor({ source_action: "import" }, { operation: "execute" })).toMatchObject({ imports: 1 });
  expect(impactFor({ source_action: "export members|bookings" }, { operation: "bookings" })).toMatchObject({ exports: 1 });
});
