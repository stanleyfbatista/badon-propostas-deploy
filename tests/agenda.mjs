import assert from "node:assert/strict";
import { build } from "esbuild";
const built = await build({
  entryPoints: ["studio/agenda-model.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const m = await import(
  "data:text/javascript;base64," +
    Buffer.from(built.outputFiles[0].text).toString("base64")
);
assert.equal(m.agendaRange("2026-10-19", "month")[0], "2026-09-28");
assert.equal(m.agendaRange("2026-10-19", "month").length, 42);
assert.equal(m.agendaRange("2026-10-19", "week", false)[0], "2026-10-18");
assert.deepEqual(m.agendaRange("2026-10-19", "day"), ["2026-10-19"]);
assert.equal(m.agendaRange("2028-02-10", "agenda").length, 29);
assert.equal(m.navigateAgenda("2026-12-31", "month", 1), "2027-01-01");
assert.equal(m.addCalendarDays("2026-03-08", 1), "2026-03-09");
assert.equal(m.daysBetween("2026-03-07", "2026-03-09"), 2);
const t = { start_date: "2026-10-17", due_date: "2026-10-21" };
assert.equal(m.taskOnDay(t, "2026-10-19"), true);
assert.equal(m.taskOnDay(t, "2026-10-22"), false);
assert.equal(m.taskOnDay({ due_date: null }, "2026-10-19"), false);
assert.deepEqual(m.shiftedTaskDates(t, "2026-10-19", "2026-10-20"), {
  start_date: "2026-10-18",
  due_date: "2026-10-22",
});
assert.deepEqual(m.shiftedTaskDates(t, "2026-10-19", "2026-10-20", true), {
  start_date: "2026-10-17",
  due_date: "2026-10-20",
});
assert.throws(() => m.shiftedTaskDates(t, "2026-10-19", "2026-10-16", true));
assert.deepEqual(
  m.shiftedTaskDates({ due_date: "2026-10-19" }, "2026-10-19", "2026-10-20"),
  { start_date: null, due_date: "2026-10-20" },
);
let calls = 0;
const fake = async (a, b, q) => {
  calls++;
  assert.equal(q.calendar, "1");
  return {
    items: Array.from({ length: q.page === 3 ? 50 : 200 }, (_, i) => ({
      id: (q.page - 1) * 200 + i,
    })),
    people: [],
    total: 450,
  };
};
let data = await m.loadAgenda(fake, {});
assert.equal(calls, 3);
assert.equal(data.items.length, 450);
assert.equal(data.limited, false);
calls = 0;
data = await m.loadAgenda(async (a, b, q) => {
  calls++;
  return {
    items: Array.from({ length: 200 }, (_, i) => ({
      id: (q.page - 1) * 200 + i,
    })),
    total: 2500,
  };
}, {});
assert.equal(calls, 10);
assert.equal(data.items.length, 2000);
assert.equal(data.limited, true);
await assert.rejects(
  m.loadAgenda(async () => {
    throw Error("Sem acesso");
  }, {}),
  /Sem acesso/,
);
console.log(
  "OK · Agenda: datas civis, intervalos, reagendamento e paginação limitada explícita.",
);
