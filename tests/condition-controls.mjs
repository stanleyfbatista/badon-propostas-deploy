import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const compiled = await build({
  entryPoints: ["studio/ConditionControls.tsx"],
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
const { AddConditionButton, comparisonOptions } = module.exports;
for (const type of [
  "multiple",
  "single",
  "select",
  "yesno",
  "number",
  "text",
]) {
  const field = {
    key: "budget",
    label: "Investimento",
    type,
    options:
      type === "number" || type === "text"
        ? []
        : ["Menos de R$ 1.000,00", "Mais"],
    rules: [],
  };
  const onAdd = (rule) => field.rules.push(rule);
  const html = renderToStaticMarkup(
    React.createElement(AddConditionButton, { field, onAdd }),
  );
  assert.ok(
    html.includes("Adicionar condição") && !html.includes('disabled=""'),
  );
  assert.ok(html.includes('type="button"'));
  AddConditionButton({ field, onAdd }).props.onClick();
  assert.equal(field.rules.length, 1);
  assert.equal(
    field.rules[0].operator,
    type === "multiple" ? "contains" : "eq",
  );
  assert.equal(field.rules[0].value, field.options[0] || "");
  assert.equal(field.rules[0].target, "next");
  assert.ok(Object.hasOwn(comparisonOptions(type), field.rules[0].operator));
  field.rules = Array(20).fill(field.rules[0]);
  assert.equal(AddConditionButton({ field, onAdd }).props.disabled, true);
}
assert.deepEqual(Object.keys(comparisonOptions("multiple")), [
  "contains",
  "not_contains",
]);
assert.ok(Object.hasOwn(comparisonOptions("number"), "lt"));
console.log(
  "OK: adicionar condição habilitado em múltipla escolha, regra criada, operadores por tipo e limite de 20.",
);
