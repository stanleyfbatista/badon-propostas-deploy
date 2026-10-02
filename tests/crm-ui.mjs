import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Component tests without launching a browser or contacting production.
const compiled = await build({
  entryPoints: ["studio/Crm.tsx"],
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
const {
  Avatar,
  Crm,
  ProfilePanel,
  OpportunityDialog,
  isoDate,
  localDate,
  utcInput,
  stageColors,
} = module.exports;
const render = (component, props) =>
  renderToStaticMarkup(React.createElement(component, props));
const api = () => {
  throw new Error("Rendering must not make network requests");
};
assert.equal(Object.keys(stageColors).length, 9);
assert.equal(isoDate(null), null);
assert.equal(localDate(null), "");
assert.equal(utcInput(""), null);
const originalTz = process.env.TZ;
for (const tz of ["America/Sao_Paulo", "UTC", "Asia/Tokyo"]) {
  process.env.TZ = tz;
  for (const value of ["2027-01-05 15:30:00", "2027-07-02 01:45:00"]) {
    assert.equal(utcInput(localDate(value)), isoDate(value));
  }
}
if (originalTz === undefined) delete process.env.TZ;
else process.env.TZ = originalTz;
assert.match(render(Avatar, { person: { name: "Stanley Batista" } }), />SB</);
const photo = render(Avatar, {
  person: { avatar_url: "/api/profile-photo.php?actor=u%3A1" },
});
assert.match(photo, /<img/);
assert.match(photo, /alt=""/);
for (const editable of [true, false]) {
  const html = render(Crm, { api, workspace: 1, editable });
  assert.equal(html.includes("Nova oportunidade"), editable);
  assert.match(html, /Exportar página/);
}
const profile = render(ProfilePanel, {
  api,
  request: api,
  onSaved() {},
  profile: {
    actor: "u:1",
    name: "<script>bad</script>",
    email: "user@example.invalid",
    phone: "",
    appearance: "dark",
    avatar_url: null,
  },
});
assert.ok(!profile.includes("<script>"));
assert.match(profile, /&lt;script&gt;/);
assert.match(profile, /readOnly=""/);
assert.match(profile, /current-password/);
assert.match(profile, /Enviar foto do perfil/);
assert.match(profile, /type="radio"/);
const initial = {
  item: {
    id: 1,
    name: "<script>bad</script>",
    company: "",
    document: "",
    email: "",
    phone: "",
    amount: "3000.50",
    stage: "new",
    assignee: null,
    source: "Formulário",
    notes: "",
    next_action: "Reunião",
    scheduled_at: "2027-01-05 15:30:00",
    last_contact_at: null,
    lead_id: 1,
  },
  events: [
    {
      id: 1,
      actor: null,
      actor_name: "",
      message: "<script>bad</script>",
      created_at: "2027-01-01 10:00:00",
    },
  ],
  answers: [{ label: "Resposta", value: "<script>bad</script>" }],
};
for (const editable of [true, false]) {
  const html = render(OpportunityDialog, {
    initial,
    api,
    workspace: 1,
    editable,
    stages: { new: "Novo lead" },
    people: [],
    close() {},
    saved() {},
  });
  assert.match(html, /<dialog/);
  assert.match(html, /Respostas originais do formulário/);
  assert.ok(!html.includes("<script>") && html.includes("&lt;script&gt;"));
  assert.equal(html.includes("Salvar alterações"), editable);
  assert.equal(html.includes("Concluir atividade"), editable);
  assert.equal(html.includes('fieldset disabled=""'), !editable);
  assert.match(html, /datetime-local/);
}
console.log(
  "OK: CRM/perfil React, escape de respostas, campos somente leitura, foto e conversão de agenda entre três fusos.",
);
