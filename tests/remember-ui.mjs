import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({
  entryPoints: ["studio/RememberChoice.tsx"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
});
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
for (const available of [true, false]) {
  const html = renderToStaticMarkup(
    React.createElement(module.exports.RememberChoice, { available }),
  );
  assert.match(html, /type="checkbox"/);
  assert.match(html, /name="remember"/);
  assert.match(html, /Permanecer conectado/);
  assert.match(html, /aria-describedby="remember-help"/);
  assert.ok(
    !html.includes("checked="),
    "Remember is opt-in, never preselected",
  );
  assert.equal(html.includes('disabled=""'), !available);
  assert.match(
    html,
    available ? /30 dias.*dispositivo pessoal/ : /auth:migrate/,
  );
}
console.log(
  "OK: permanecer conectado acessível, desmarcado por padrão e indisponível antes da migração.",
);
