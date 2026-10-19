import assert from "node:assert/strict";
import React from "react";
import { createRequire } from "node:module";
import { build } from "esbuild";
const compiled = await build({
  stdin: {
    contents: 'export { FlowProjects } from "./studio/Flow";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
  loader: { ".css": "empty" },
});
const slots = [];
let cursor = 0;
const effects = [];
const mockReact = {
  ...React,
  useState(initial) {
    const i = cursor++;
    if (!(i in slots))
      slots[i] = typeof initial === "function" ? initial() : initial;
    return [
      slots[i],
      (v) => (slots[i] = typeof v === "function" ? v(slots[i]) : v),
    ];
  },
  useRef(initial) {
    const i = cursor++;
    return (slots[i] ??= { current: initial });
  },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!slots[i] || deps.some((v, j) => v !== slots[i][j])) {
      slots[i] = deps;
      effects.push(fn);
    }
  },
};
const module = { exports: {} };
const require = createRequire(import.meta.url);
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  (n) => (n === "react" ? mockReact : require(n)),
  module,
  module.exports,
);
const { FlowProjects } = module.exports;
let readResolve, saveResolve;
const calls = [];
let changed = 0;
const props = {
  workspace: 4,
  navigate() {},
  onCreated() {
    changed++;
  },
  api(action, data) {
    calls.push({ action, data });
    return new Promise((resolve) => {
      if (action === "flow-projects") readResolve = resolve;
      else saveResolve = resolve;
    });
  },
};
const draw = () => {
  cursor = 0;
  return FlowProjects(props);
};
function nodes(n) {
  if (!n || typeof n !== "object") return [];
  if (Array.isArray(n)) return n.flatMap(nodes);
  return [n, ...nodes(n.props?.children)];
}
let tree = draw();
effects.splice(0).forEach((fn) => fn());
nodes(tree)
  .find((n) => n.type === "button")
  .props.onClick();
tree = draw();
nodes(tree)
  .find((n) => n.type === "input" && n.props.placeholder)
  .props.onChange({ target: { value: "Projeto novo" } });
tree = draw();
const submit = nodes(tree).find((n) => n.type === "form").props.onSubmit;
const pending = submit({ preventDefault() {} });
await submit({ preventDefault() {} });
assert.equal(
  calls.filter((c) => c.action === "flow-project-create").length,
  1,
  "Duplo envio bloqueado",
);
saveResolve({ id: 77, items: [{ id: 77, name: "Projeto novo", tasks: 0 }] });
await pending;
tree = draw();
assert.ok(
  nodes(tree).some(
    (n) => n.type === "h2" && n.props.children === "Projeto novo",
  ),
  "Projeto aparece sem recarregar ou consultar novamente",
);
assert.equal(changed, 1);
readResolve({ items: [] });
await Promise.resolve();
tree = draw();
assert.ok(
  nodes(tree).some(
    (n) => n.type === "h2" && n.props.children === "Projeto novo",
  ),
  "Consulta antiga não pode apagar projeto recém-criado",
);
assert.equal(calls.filter((c) => c.action === "flow-projects").length, 1);
console.log(
  "OK · Projetos: inclusão imediata, leitura obsoleta descartada e duplo envio bloqueado.",
);
