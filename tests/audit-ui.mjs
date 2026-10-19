import assert from "node:assert/strict";
import React from "react";
import { createRequire } from "node:module";
import { build } from "esbuild";

const compiled = await build({
  stdin: {
    contents:
      'export * from "./studio/panel-route"; export * from "./studio/FlowWorkspace"; export { TaskDialog } from "./studio/Tasks"; export { blankTask } from "./studio/task-model";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
  loader: { ".css": "empty" },
});
let slots = [],
  cursor = 0,
  effects = [];
const mocked = {
  ...React,
  useState(initial) {
    const i = cursor++;
    if (!(i in slots))
      slots[i] = typeof initial === "function" ? initial() : initial;
    return [
      slots[i],
      (v) => {
        slots[i] = typeof v === "function" ? v(slots[i]) : v;
      },
    ];
  },
  useRef(initial) {
    return (slots[cursor++] ??= { current: initial });
  },
  useId() {
    return "audit-" + cursor++;
  },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!slots[i] || deps.some((v, j) => v !== slots[i][j])) {
      slots[i] = deps;
      effects.push(fn);
    }
  },
};
const require = createRequire(import.meta.url),
  module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  (n) => (n === "react" ? mocked : require(n)),
  module,
  module.exports,
);
const {
  readPanelRoute,
  resolvePanelRoute,
  panelUrl,
  defaultWorkspace,
  useDeliveryDialog,
  FlowHome,
  FlowWork,
  TaskDialog,
  blankTask,
} = module.exports;
const spaces = [
  { id: 4, name: "Cliente A", slug: "cliente-a" },
  { id: 9, name: "Produtora", slug: "badon" },
];
assert.equal(defaultWorkspace(spaces, true), 9);
assert.equal(defaultWorkspace(spaces, false), 4);
const route = { view: "client", workspace: 4, project: 17 };
assert.deepEqual(readPanelRoute(panelUrl(route).split("?")[1]), route);
assert.equal(
  resolvePanelRoute({ view: "crm", workspace: 0, project: 0 }, spaces, true)
    .workspace,
  9,
);
assert.deepEqual(
  resolvePanelRoute(
    { view: "client", workspace: 500, project: 20 },
    spaces,
    true,
  ),
  { view: "clients", workspace: 9, project: 0 },
);
assert.equal(resolvePanelRoute(route, spaces, false).view, "portal");
assert.deepEqual(
  readPanelRoute("?view=javascript:alert(1)&workspace=-1&project=Infinity"),
  { view: "overview", workspace: 0, project: 0 },
);
assert.equal(readPanelRoute("?workspace=90071992547409999").workspace, 0);

const reset = () => {
  slots = [];
  effects = [];
  cursor = 0;
};
const draw = (fn, props) => {
  cursor = 0;
  return fn(props);
};
const nodes = (n) =>
  !n || typeof n !== "object"
    ? []
    : Array.isArray(n)
      ? n.flatMap(nodes)
      : [n, ...nodes(n.props?.children)];
const text = (n) =>
  n == null || typeof n === "boolean"
    ? ""
    : typeof n !== "object"
      ? String(n)
      : Array.isArray(n)
        ? n.map(text).join("")
        : text(n.props?.children);
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const props = {
  actor: "a:1",
  spaces,
  workspace: 4,
  api: async () => ({ people: [] }),
};
for (const workspace of [0, 4]) {
  for (const status of ["todo", "doing", "review", "done"]) {
    reset();
    const p = { ...props, workspace };
    let editor = draw((p) => useDeliveryDialog(p, () => {}), p);
    editor.createInStatus(status);
    await flush();
    editor = draw((p) => useDeliveryDialog(p, () => {}), p);
    if (!workspace) {
      nodes(editor.dialog)
        .find((n) => n.type === "button" && text(n).startsWith("Continuar"))
        .props.onClick();
      await flush();
      editor = draw((p) => useDeliveryDialog(p, () => {}), p);
    }
    const dialog = nodes(editor.dialog).find((n) => n.type === TaskDialog);
    assert.equal(dialog.props.initial.item.status, status);
    assert.equal(dialog.props.noun, "demanda");
    assert.equal(dialog.props.workspace, 4);
  }
}

reset();
const tasks = ["todo", "doing", "review"].map((status, i) => ({
  id: i + 1,
  status,
  title: status,
  assignee: "a:1",
  workspace_id: 4,
}));
const homeProps = {
  ...props,
  navigate() {},
  api: async (action) =>
    action === "flow-overview"
      ? { tasks, today: "2026-10-19", attention_end: "2026-10-22", clients: 1 }
      : { items: [] },
};
draw(FlowHome, homeProps);
effects.splice(0).forEach((fn) => fn());
await flush();
let tree = draw(FlowHome, homeProps);
const metric = nodes(tree).find(
  (n) => n.type === "button" && text(n).startsWith("Em andamento"),
);
assert.equal(nodes(metric).find((n) => n.type === "strong").props.children, 1);
metric.props.onClick();
tree = draw(FlowHome, homeProps);
assert.equal(
  nodes(tree).filter(
    (n) => n.type === "button" && n.props.className === "flow-row",
  ).length,
  1,
);

reset();
const boardElement = FlowWork(props);
tree = draw(boardElement.type, boardElement.props);
assert.deepEqual(
  nodes(tree)
    .filter((n) => n.type === "section" && n.props["data-status"])
    .map((n) => n.props["data-status"]),
  ["todo", "doing", "review", "done"],
);

reset();
let closed = 0,
  calls = [];
const dialogProps = {
  ...props,
  initial: { item: blankTask("a:1") },
  people: [],
  editable: true,
  noun: "demanda",
  close: () => closed++,
  saved() {},
  api: async (...args) => {
    calls.push(args);
  },
};
tree = draw(TaskDialog, dialogProps);
assert.ok(nodes(tree).some((n) => n.props?.title === "Nova demanda"));
nodes(tree)
  .find(
    (n) =>
      n.type === "input" && n.props.placeholder?.startsWith("Nova demanda"),
  )
  .props.onChange({ target: { value: "Rascunho preservado" } });
tree = draw(TaskDialog, dialogProps);
nodes(tree)
  .find((n) => n.type === "button" && text(n) === "Fechar")
  .props.onClick();
tree = draw(TaskDialog, dialogProps);
assert.ok(nodes(tree).some((n) => n.props?.title === "Descartar alterações?"));
assert.equal(closed, 0);
nodes(tree)
  .find((n) => n.type === "button" && text(n) === "Continuar editando")
  .props.onClick();
tree = draw(TaskDialog, dialogProps);
assert.ok(
  nodes(tree).some(
    (n) => n.type === "input" && n.props.value === "Rascunho preservado",
  ),
);
nodes(tree)
  .find((n) => n.type === "button" && text(n) === "Fechar")
  .props.onClick();
tree = draw(TaskDialog, dialogProps);
nodes(tree)
  .find((n) => n.type === "button" && text(n) === "Descartar e sair")
  .props.onClick();
assert.equal(closed, 1);
assert.equal(calls.length, 0);
console.log(
  "OK · Auditoria: rotas, espaço padrão, status herdado, contagem correta, quatro colunas e descarte protegido.",
);
