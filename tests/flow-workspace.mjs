import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const compiled = await build({
  stdin: {
    contents:
      'export * from "./studio/FlowWorkspace"; export * from "./studio/flow-calendar";',
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
assert.match(
  render(ClientCover, { client, small: true }),
  /flow-cover-art small/,
);
assert.match(render(ClientCover, { client }), /BĀDON \+ CLIENTE/);
assert.match(render(ClientMark, { client }), /CJ/);
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
    mode === "calendar" ? /flow-calendar-grid/ : /flow-delivery-board/,
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
