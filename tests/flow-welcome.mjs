import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({ entryPoints: ["studio/FlowWelcome.tsx"], bundle: true, write: false, platform: "node", format: "cjs", external: ["react"], loader: { ".css": "empty" } });
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const render = props => renderToStaticMarkup(React.createElement(module.exports.FlowWelcome, props, React.createElement("form", null, React.createElement("h1", { id: "welcome-login-title" }, "Login existente"))));
const landing = render({});
assert.match(landing, /Seu próximo nível/);
assert.match(landing, /Visualização ilustrativa/);
assert.match(landing, /Gente de verdade/);
assert.doesNotMatch(landing, /<dialog/);
assert.doesNotMatch(landing, /Sign Up|Criar conta|Cadastre-se/);
for (const props of [{ initialOpen: true }, { sessionExpired: true }]) {
  const html = render(props);
  assert.match(html, /<dialog[^>]*aria-labelledby="welcome-login-title"/);
  assert.match(html, /aria-label="Fechar login"/);
  assert.match(html, /Login existente/);
}
for (const [, src] of landing.matchAll(/src="([^"]+)"/g)) assert.ok(existsSync("public" + src), "Asset local disponível: " + src);
const app = readFileSync("studio/main.tsx", "utf8");
assert.match(app, /initialOpen=\{!!token \|\| location.pathname !== "\/"\}/);
assert.match(app, /token \? "accept" : "login"/);
assert.match(app, /remember: d.get\("remember"\) === "on"/);
console.log("OK: apresentação pública sem dados reais, assets existentes, login modal acessível e convites preservados.");
