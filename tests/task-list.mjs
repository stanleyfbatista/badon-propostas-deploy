import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({
  stdin: {
    contents:
      'export * from "./studio/TaskList"; export * from "./studio/task-model";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
  loader: { ".css": "empty" },
});
function load(react = React) {
  const module = { exports: {} };
  const require = createRequire(import.meta.url);
  new Function("require", "module", "exports", compiled.outputFiles[0].text)(
    (name) => (name === "react" ? react : require(name)),
    module,
    module.exports,
  );
  return module.exports;
}
const { TaskList, QuickTask, blankTask, taskGroup, dueLabel } = load();
const render = (c, p) => renderToStaticMarkup(React.createElement(c, p));
const item = {
  ...blankTask("u:1"),
  id: 1,
  title: "<script>Briefing</script>",
  visibility: "private",
  status: "review",
  start_date: "2027-01-01",
  due_date: "2027-01-04",
  checklist: [{ id: crypto.randomUUID(), text: "Entrega", done: false }],
  opportunity_id: 1,
  opportunity_company: "<img>Cliente",
  opportunity_name: "Contato",
};
assert.equal(taskGroup(item, "2027-01-05", "date"), "overdue");
assert.equal(taskGroup(item, "2027-01-05", "status"), "review");
assert.equal(
  taskGroup({ ...item, due_date: "2027-01-05" }, "2027-01-05", "date"),
  "today",
);
assert.equal(
  taskGroup({ ...item, due_date: "2027-01-06" }, "2027-01-05", "date"),
  "upcoming",
);
assert.equal(
  taskGroup({ ...item, due_date: null }, "2027-01-05", "date"),
  "undated",
);
assert.equal(
  taskGroup({ ...item, status: "done" }, "2027-01-05", "date"),
  "done",
);
assert.equal(dueLabel("2027-01-02"), "02/01/2027");
for (const grouping of ["status", "date"])
  for (const editable of [true, false]) {
    const html = render(TaskList, {
      items: [item],
      people: [],
      today: "2027-01-05",
      grouping,
      editable,
      busy: false,
      archived: false,
      open() {},
      update() {},
      openOpportunity() {},
      add() {},
    });
    assert.match(html, /<table/);
    assert.match(html, /<summary/);
    assert.match(html, /01\/01\/2027/);
    assert.match(html, /04\/01\/2027/);
    assert.match(html, /Em atraso/);
    assert.match(html, /Em aprovação/);
    assert.match(html, /Particular/);
    assert.match(html, /0\/1/);
    assert.ok(!html.includes("<script>") && !html.includes("<img>"));
    assert.equal(html.includes("Adicionar tarefa"), editable);
    assert.equal(
      (html.match(/<select[^>]*disabled/g) || []).length,
      editable ? 0 : 2,
    );
  }
const archived = render(TaskList, {
  items: [{ ...item, archived: 1 }],
  people: [],
  today: "2027-01-05",
  grouping: "status",
  editable: true,
  busy: false,
  archived: true,
  open() {},
  update() {},
  openOpportunity() {},
  add() {},
});
assert.ok(!archived.includes("Adicionar tarefa"));
assert.equal((archived.match(/<select[^>]*disabled/g) || []).length, 2);
const quick = render(QuickTask, {
  api() {},
  workspace: 1,
  actor: "u:1",
  disabled: false,
  day: true,
  created() {},
});
assert.match(quick, /O que precisa ser feito/);
assert.match(quick, /Vencimento/);
assert.ok(!quick.includes('value="done"'));

// Exercise the component handlers with an isolated hook harness (no browser/DOM).
const slots = [];
let cursor = 0;
const mockReact = {
  ...React,
  useState(init) {
    const at = cursor++;
    if (!(at in slots)) slots[at] = typeof init === "function" ? init() : init;
    return [
      slots[at],
      (value) => {
        slots[at] = typeof value === "function" ? value(slots[at]) : value;
      },
    ];
  },
  useRef(init) {
    const at = cursor++;
    return (slots[at] ??= { current: init });
  },
};
const TestQuick = load(mockReact).QuickTask;
const calls = [],
  created = [];
let resolve;
let fail = true;
const props = {
  workspace: 17,
  actor: "u:4",
  disabled: false,
  created: (id) => created.push(id),
  api: async (action, data) => {
    calls.push({ action, data });
    await new Promise((r) => (resolve = r));
    if (fail) throw new Error("Conexão interrompida");
    return { id: 77 };
  },
};
const draw = () => {
  cursor = 0;
  return TestQuick(props);
};
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
let tree = draw();
find(tree, (n) => n.type === "input" && n.props.placeholder).props.onChange({
  target: { value: "Organizar briefing" },
});
tree = draw();
find(tree, (n) => n.type === "select").props.onChange({
  target: { value: "review" },
});
tree = draw();
find(tree, (n) => n.type === "input" && n.props.type === "date").props.onChange(
  { target: { value: "2027-02-01" } },
);
tree = draw();
const submit = find(tree, (n) => n.type === "form").props.onSubmit;
const first = submit({ preventDefault() {} });
await submit({ preventDefault() {} });
assert.equal(calls.length, 1, "Double submit must not create two requests");
resolve();
await first;
tree = draw();
assert.equal(
  find(tree, (n) => n.type === "input" && n.props.placeholder).props.value,
  "Organizar briefing",
);
assert.ok(find(tree, (n) => n.props?.role === "alert"));
fail = false;
const retry = find(tree, (n) => n.type === "form").props.onSubmit({
  preventDefault() {},
});
resolve();
await retry;
assert.equal(
  calls[1].data.create_key,
  calls[0].data.create_key,
  "Retries keep the same idempotency key",
);
assert.equal(calls[1].data.workspace, 17);
assert.equal(calls[1].data.assignee, "u:4");
assert.equal(calls[1].data.status, "review");
assert.equal(calls[1].data.due_date, "2027-02-01");
assert.deepEqual(created, [77]);
tree = draw();
assert.equal(
  find(tree, (n) => n.type === "input" && n.props.placeholder).props.value,
  "",
);
console.log(
  "OK: listas agrupadas, datas, leitura/arquivo, escape, inclusão rápida, duplo clique, falha sem perda do texto e reenvio idempotente.",
);
