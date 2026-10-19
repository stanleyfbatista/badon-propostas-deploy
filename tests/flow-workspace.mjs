import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const compiled = await build({
  stdin: {
    contents:
      'export * from "./studio/FlowWorkspace"; export { ClientDialog } from "./studio/Flow"; export * from "./studio/flow-calendar"; export * from "./studio/FlowTaskTable"; export * from "./studio/TaskControls"; export * from "./studio/TaskAttachments";',
    resolveDir: process.cwd(),
  },
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
const { monthDays, ClientCover, ClientMark, FlowWork, deliveryCalendar } =
  module.exports;
const {
  calendarDays,
  taskFieldUpdate,
  FlowTaskTable,
  deliveryGroups,
  TaskAttachments,
  DateField,
} = module.exports;
assert.equal(calendarDays("2026-10")[0], "2026-09-28");
assert.equal(calendarDays("2026-10").length, 42);
assert.ok(calendarDays("2028-02").includes("2028-02-29"));
const originalTask = {
  id: 4,
  workspace_id: 2,
  revision: 7,
  title: "Campanha",
  description: "Não sobrescrever",
  status: "doing",
  priority: "normal",
  checklist: [{ id: "abc", text: "Preservar", done: false }],
  extras: {
    cover: "/api/flow-file.php?id=9",
    links: [{ name: "Arte", url: "/api/flow-file.php?id=9" }],
    tags: ["Marca"],
  },
};
const updated = taskFieldUpdate(originalTask, "priority", "high");
assert.equal(updated.priority, "high");
assert.equal(updated.revision, 7);
assert.equal(updated.description, originalTask.description);
assert.deepEqual(updated.extras, originalTask.extras);
assert.deepEqual(updated.checklist, originalTask.checklist);
assert.equal(originalTask.priority, "normal");
const days = monthDays("2026-10");
assert.equal(days.length, 42);
assert.equal(days[0], "2026-09-28");
assert.equal(days[41], "2026-11-08");
assert.equal(new Set(days).size, 42);
assert.ok(monthDays("2028-02").includes("2028-02-29"));
const client = {
  name: "Clínica Jardim <script>",
  details: { color: "#6d805c", cover: "", photo: "" },
};
const render = (c, p) => renderToStaticMarkup(React.createElement(c, p));
const listMarkup = render(FlowTaskTable, {
  items: [originalTask],
  people: [],
  api() {
    throw Error("No network");
  },
  open() {},
  changed() {},
  disabled: false,
});
assert.match(listMarkup, /Agrupar demandas por/);
assert.match(listMarkup, /Recolher grupos/);
const manyItems = Array.from({length: 24}, (_, i) => ({...originalTask, id: i + 1, title: `Demanda ${i + 1}`, client: 'Cliente A'}));
const groupedMarkup = render(FlowTaskTable, {items: [...manyItems, {...originalTask, id: 99, title: 'Concluída recolhida', status:'done'}], people: [], api() {}, open() {}, changed() {}, disabled:false});
assert.equal((groupedMarkup.match(/class="flow-table-title"/g) || []).length, 10);
assert.match(groupedMarkup, /Mostrar mais 10/);
assert.match(groupedMarkup, /24 demandas/);
assert.ok(!groupedMarkup.includes('Concluída recolhida'));
assert.deepEqual(deliveryGroups([{...originalTask, status:'done'}, originalTask], 'status').map(g => g.id), ['doing', 'done']);
const clients = deliveryGroups([{...originalTask, client:'Mesmo nome'}, {...originalTask,id:5,workspace_id:3,client:'Mesmo nome'}], 'client');
assert.equal(clients.length, 2, 'Clientes com nomes iguais não se misturam');
assert.equal(clients.reduce((sum,g) => sum + g.items.length,0), 2);
assert.deepEqual(deliveryGroups([], 'client'), []);
for (const label of [
  "Status de Campanha",
  "Prioridade de Campanha",
  "Responsável por Campanha",
  "Início de Campanha",
  "Vencimento de Campanha",
  "Etiquetas de Campanha",
])
  assert.ok(listMarkup.includes(label));
const filesMarkup = render(TaskAttachments, {
  item: originalTask,
  workspace: 2,
  files: [{ url: "/api/flow-file.php?id=9", name: "Arte", mime: "image/png" }],
  change() {},
  onBusy() {},
});
assert.match(filesMarkup, /Visualizar Arte/);
assert.match(filesMarkup, /Remover capa/);
assert.ok(!filesMarkup.includes("URL HTTPS"));
assert.ok(!filesMarkup.includes("Adicionar link"));
assert.ok(!filesMarkup.includes("Endereço do link"));
const legacyReferences = render(TaskAttachments, {
  item: {
    ...originalTask,
    extras: {
      ...originalTask.extras,
      links: [
        {
          name: "Referência existente",
          url: "https://example.invalid/reference",
        },
      ],
    },
  },
  workspace: 2,
  change() {},
  onBusy() {},
});
assert.match(legacyReferences, /href="https:\/\/example.invalid\/reference"/);
assert.match(legacyReferences, /Referência existente/);
const dateMarkup = render(DateField, {
  value: "2026-10-17",
  min: "2026-10-17",
  max: "2026-10-19",
  onChange() {},
});
assert.match(dateMarkup, /aria-label="16\/10\/2026"[^>]*disabled/);
assert.match(dateMarkup, /aria-label="17\/10\/2026" aria-pressed="true"/);
assert.match(
  render(ClientCover, { client, small: true }),
  /flow-cover-art small/,
);
assert.match(render(ClientCover, { client }), /BĀDON \+ CLIENTE/);
assert.match(render(ClientMark, { client }), /CJ/);
assert.match(
  render(ClientMark, { client, onEdit() {} }),
  /aria-label="Alterar foto do cliente"/,
);
assert.match(render(ClientCover, { client, onEdit() {} }), /Alterar capa/);
assert.ok(!render(ClientMark, { client }).includes("<button"));
assert.ok(!render(ClientCover, { client }).includes("<button"));
const clientEditor = render(module.exports.ClientDialog, {
  initial: { ...client, workspace_id: 2, active: true, revision: 1 },
  spaces: [],
  api() {},
  navigate() {},
  close() {},
  saved() {},
  initialMedia: "cover",
});
assert.ok(
  clientEditor.indexOf("Foto do perfil") <
    clientEditor.indexOf("Imagem de capa"),
);
assert.ok(
  clientEditor.indexOf("Imagem de capa") <
    clientEditor.indexOf("Nome da empresa"),
);
assert.match(
  clientEditor,
  /type="file" autoFocus="" aria-label="Alterar capa"/i,
);
for (const mode of ["board", "calendar", "review"]) {
  const html = render(FlowWork, {
    api() {
      throw new Error("No network during render");
    },
    actor: "a:1",
    spaces: [],
    mode,
  });
  assert.ok(!html.includes("Meu dia"));
  assert.match(
    html,
    mode === "calendar" ? /agenda-grid/ : /flow-delivery-board/,
  );
  assert.match(html, /Nova demanda/);
  if (mode === "board") {
    assert.match(html, /A fazer/);
    assert.match(html, /Concluído/);
  }
}
const ics = deliveryCalendar(
  {
    id: 2,
    title: "Título, com; quebra\nBEGIN:VEVENT",
    description: "Texto \\ e ação".repeat(30),
    due_date: "2026-12-31",
  },
  5,
  new Date("2026-10-17T18:00:00Z"),
);
assert.match(ics, /DTEND;VALUE=DATE:20270101/);
assert.match(ics, /DTSTAMP:20261017T180000Z/);
assert.ok(ics.includes("SUMMARY:Título\\, com\\; quebra\\nBEGIN:VEVENT"));
assert.equal(ics.split("\r\nBEGIN:VEVENT").length, 2);
assert.ok(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75));
assert.throws(() => deliveryCalendar({ id: 0, due_date: null }, 1));
console.log(
  "OK · Bādon workspace: capas, três colunas, agenda mensal e exportação local segura.",
);
