import { expect, test } from "bun:test";
import { executeK8Operation } from "../src/tools/event-plan/handlers.ts";
import { K8_ACTION_SCHEMAS } from "../src/tools/event-plan/schemas.ts";

// BUG 39bd671c: a series on an existing template (yearly, manual) and materialize_next must reach the
// event-service with the fields it reads (EventSeriesCreate/-Update, MaterializeNextRequest).
type Args = Parameters<typeof executeK8Operation>;
const action = "cai.event.08.series_list_show_create_materialize_promote_recurring_promote_yearly_n" as const;
const club = "11111111-1111-4111-8111-111111111111";
const department = "22222222-2222-4222-8222-222222222222";
const template = "33333333-3333-4333-8333-333333333333";
const seriesId = "44444444-4444-4444-8444-444444444444";
const schema = K8_ACTION_SCHEMAS[action].input;
const confirmation = { preview_id: "55555555-5555-4555-8555-555555555555", confirmation_token: "t".repeat(40) };

async function send(operation: string, input: Record<string, unknown>) {
  const parsed = schema.parse({ club_id: club, operation, ...input }) as Args[2];
  const requests: Record<string, unknown>[] = [];
  const client = { request: async (request: Record<string, unknown>) => { requests.push(request); return { id: seriesId }; } } as unknown as Args[4];
  await executeK8Operation(action, operation, parsed, { club_id: club, request_id: "synthetic" } as Args[3], client);
  expect(requests).toHaveLength(1);
  return requests[0]!;
}

const yearly = {
  title: "Königsschießen",
  template_event_id: template,
  department_id: department,
  series_type: "YEARLY_TEMPLATE",
  materialization_mode: "MANUAL",
  dtstart: "2026-10-03T18:00:00+02:00",
  duration_minutes: 300,
};

test("create: yearly series on an existing template sends the service's fields", async () => {
  const request = await send("create", { series: yearly });
  expect(request).toMatchObject({ method: "POST", path: "/event-series/" });
  expect(request.body).toEqual({
    club_id: club,
    title: "Königsschießen",
    template_event_id: template,
    default_department_id: department,
    series_type: "YEARLY_TEMPLATE",
    materialization_mode: "MANUAL",
    dtstart: "2026-10-03T18:00:00+02:00",
    duration_minutes: 300,
    timezone: "Europe/Berlin",
  });
});

test("create: a recurring series keeps its rule and defaults to RECURRING/AUTO", async () => {
  const request = await send("create", { series: { title: "Darttraining", template_event_id: template, department_id: department, rrule: "FREQ=WEEKLY;BYDAY=WE", dtstart: "2026-01-07T19:00:00+01:00", duration_minutes: 120 } });
  expect(request.body).toMatchObject({ title: "Darttraining", rrule: "FREQ=WEEKLY;BYDAY=WE", series_type: "RECURRING", materialization_mode: "AUTO", default_department_id: department });
});

for (const series of [
  { ...yearly, template_event_id: undefined }, // a series always needs its template
  { ...yearly, title: undefined, name: "Königsschießen" }, // the service reads title, not name
  { ...yearly, series_type: "RECURRING", materialization_mode: "AUTO" }, // recurring without a rule
  { ...yearly, series_type: "WEEKLY" },
]) {
  test(`create rejects ${JSON.stringify(Object.keys(series).filter((k) => (series as Record<string, unknown>)[k] !== undefined))} ${series.series_type}`, () => {
    expect(() => schema.parse({ club_id: club, operation: "create", series })).toThrow();
  });
}

test("update: changes map department_id and do not reset type or mode", async () => {
  const request = await send("update", { series_id: seriesId, changes: { title: "Königsschießen 2027", department_id: department } });
  expect(request).toMatchObject({ method: "PATCH", path: `/event-series/${seriesId}` });
  expect(request.body).toEqual({ title: "Königsschießen 2027", default_department_id: department });
});

test("materialize_next sends the start of the next instance", async () => {
  const request = await send("materialize_next", { series_id: seriesId, start_time: "2027-10-02T18:00:00+02:00", confirmation });
  expect(request).toMatchObject({ method: "POST", path: `/event-series/${seriesId}/materialize-next`, body: { start_time: "2027-10-02T18:00:00+02:00" } });
});

test("materialize_next requires a start", () => {
  expect(() => schema.parse({ club_id: club, operation: "materialize_next", series_id: seriesId })).toThrow();
});
