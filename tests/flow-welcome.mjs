import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({
  stdin: {
    contents:
      'export * from "./studio/FlowWelcome"; export * from "./studio/FlowMemberHome"; export * from "./studio/login-validation";',
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
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(
      module.exports.FlowWelcome,
      props,
      React.createElement(
        "form",
        null,
        React.createElement(
          "h1",
          { id: "welcome-login-title" },
          "Login existente",
        ),
      ),
    ),
  );
const landing = render({});
assert.match(landing, /Seu negócio/);
assert.match(landing, /Acessar meu espaço/);
assert.match(landing, /clientes e parceiros convidados/);
assert.doesNotMatch(landing, /Visualização ilustrativa|Conhecer a plataforma/);
const team = render({ initialAudience: "team" });
assert.match(team, /Bom trabalho/);
assert.match(team, /Acessar espaço da equipe/);
assert.match(team, /Visualização ilustrativa/);
assert.equal(module.exports.accessAudience("?acesso=equipe"), "team");
assert.equal(module.exports.accessAudience("?acesso=admin"), "client");
assert.equal(module.exports.accessUrl("team", true), "/entrar?acesso=equipe");
assert.equal(module.exports.accessUrl("client"), "/?acesso=cliente");
assert.match(landing, /Gente de verdade/);
assert.doesNotMatch(landing, /<dialog/);
assert.doesNotMatch(landing, /Sign Up|Criar conta|Cadastre-se/);
for (const props of [{ initialOpen: true }, { sessionExpired: true }]) {
  const html = render(props);
  assert.match(html, /<dialog[^>]*aria-labelledby="welcome-login-title"/);
  assert.match(html, /aria-label="Fechar login"/);
  assert.match(html, /Login existente/);
}
for (const [, src] of landing.matchAll(/src="([^"]+)"/g))
  assert.ok(existsSync("public" + src), "Asset local disponível: " + src);
const app = readFileSync("studio/main.tsx", "utf8");
assert.match(app, /initialOpen=\{!!token \|\| location.pathname !== "\/"\}/);
assert.match(app, /token \? "accept" : "login"/);
assert.match(app, /remember: d.get\("remember"\) === "on"/);
const validate = module.exports.validateLoginFields;
for (const mode of ["login", "magic"]) {
  for (const email of [
    "",
    "   ",
    "nome",
    "nome@",
    "nome@empresa",
    "nome@@empresa.com",
    "nome @empresa.com",
    "a".repeat(191) + "@empresa.com",
  ])
    assert.equal(validate(mode, email, "senha")?.field, "email");
}
assert.equal(
  validate("login", "cliente@example.invalid", "")?.field,
  "password",
);
assert.equal(validate("magic", "cliente@example.invalid", ""), null);
assert.equal(validate("login", "  CLIENTE@example.invalid  ", "senha"), null);
assert.match(app, /validateLogin\(e.currentTarget, "login"\)/);
assert.match(app, /validateLogin\(e.currentTarget.form!, "magic"\)/);
assert.match(app, /auth-request-notice/);
assert.match(
  app,
  /v === "overview" && b.user && !b.user.agency \? "portal" : v/,
);
const empty = renderToStaticMarkup(
  React.createElement(module.exports.FlowMemberHome, {
    api: () => {
      throw new Error("No network in SSR");
    },
    actor: "u:1",
    spaces: [],
    workspace: 0,
    ready: true,
    editable: false,
    navigate: () => {},
  }),
);
assert.match(empty, /aguardando liberação/);
assert.doesNotMatch(empty, /Criar conta/);
const portal = readFileSync("studio/FlowMemberHome.tsx", "utf8");
assert.doesNotMatch(portal, /api\("flow-(clients|overview|sales)"/);
console.log(
  "OK: entradas equipe/cliente sem cadastro público, login contextual, portal por permissões e convites preservados.",
);
