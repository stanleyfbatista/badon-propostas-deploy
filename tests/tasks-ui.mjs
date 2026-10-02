import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const compiled = await build({
  entryPoints: ["studio/Tasks.tsx"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
  loader: { ".css": "empty" },
});
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const { Tasks, TaskDialog, TaskCard, dayBounds, todayLocal, blankTask } =
  module.exports;
const render = (component, props) =>
  renderToStaticMarkup(React.createElement(component, props));
const api = () => {
  throw new Error("No network during component rendering");
};
const original = process.env.TZ;
for (const tz of [
  "America/Sao_Paulo",
  "UTC",
  "Asia/Tokyo",
  "America/New_York",
]) {
  process.env.TZ = tz;
  assert.match(todayLocal(), /^\d{4}-\d{2}-\d{2}$/);
  for (const day of ["2027-01-05", "2027-03-14", "2027-11-07"]) {
    const bounds = dayBounds(day);
    assert.equal(new Date(bounds.start).getHours(), 0);
    assert.equal(new Date(bounds.end).getHours(), 0);
    const hours = (Date.parse(bounds.end) - Date.parse(bounds.start)) / 3600000;
    assert.ok(hours >= 23 && hours <= 25);
    if (tz === "America/New_York" && day === "2027-03-14")
      assert.equal(hours, 23);
    if (tz === "America/New_York" && day === "2027-11-07")
      assert.equal(hours, 25);
  }
}
if (original === undefined) delete process.env.TZ;
else process.env.TZ = original;
const item = {
  ...blankTask("u:1"),
  id: 1,
  title: "<script>alert(1)</script>",
  description: "Descrição",
  visibility: "private",
  due_date: "2027-01-04",
  checklist: [{ id: crypto.randomUUID(), text: "Conferir", done: false }],
};
for (const editable of [false, true]) {
  const html = render(TaskDialog, {
    initial: {
      item,
      events: [
        {
          id: 1,
          message: "<script>nota</script>",
          created_at: "2027-01-01 10:00:00",
          actor: "u:1",
        },
      ],
    },
    people: [],
    actor: "u:1",
    workspace: 1,
    api,
    editable,
    close() {},
    saved() {},
  });
  assert.ok(!html.includes("<script>") && html.includes("&lt;script&gt;"));
  assert.match(html, /Checklist/);
  assert.match(html, /Comentários e histórico/);
  assert.equal(html.includes("Salvar tarefa"), editable);
  assert.equal(html.includes('fieldset disabled=""'), !editable);
  assert.match(html, /type="date"/);
  const card = render(TaskCard, {
    item,
    people: [],
    today: "2027-01-05",
    editable,
    busy: false,
    open() {},
    toggle() {},
    openOpportunity() {},
  });
  assert.match(card, /Atrasada/);
  assert.match(card, /Tarefa particular/);
  assert.ok(!card.includes("<script>"));
}
const archived = render(TaskDialog, {
  initial: { item: { ...item, archived: 1 }, events: [] },
  people: [],
  actor: "u:1",
  workspace: 1,
  api,
  editable: true,
  close() {},
  saved() {},
});
assert.match(archived, /Restaurar tarefa/);
assert.ok(!archived.includes("Salvar tarefa"));
const day = render(Tasks, {
  api,
  workspace: 1,
  actor: "u:1",
  editable: true,
  day: true,
});
assert.match(day, /Meu dia/);
assert.match(day, /Seus agendamentos/);
assert.match(day, /Retomar uma conversa/);
const reader = render(Tasks, {
  api,
  workspace: 1,
  actor: "u:2",
  editable: false,
});
assert.ok(!reader.includes("Nova tarefa"));
console.log(
  "OK: Tarefas/Meu dia React, leitura, arquivo, checklist, escape de conteúdo e limites do dia em quatro fusos, incluindo horário de verão.",
);
