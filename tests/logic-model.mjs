import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildGraph, connectFlow } from "../studio/logic-model.ts";
import "../public/forms-assets/flow-engine.js";

const php = process.env.PHP_BIN || "/opt/homebrew/opt/php@8.4/bin/php";
const definition = JSON.parse(
  execFileSync(php, ["tests/flow.php", "--fixture"], { encoding: "utf8" }),
);
const draft = { definition, layout: { "q:email": { x: 130, y: 240 } } };
const graph = buildGraph(draft, "email");
assert.equal(graph.nodes.length, definition.fields.length + 3);
assert.equal(graph.warnings.length, 0);
assert.equal(
  buildGraph(
    { definition: { ...definition, welcome: { enabled: false } } },
    "welcome",
  ).nodes.find((node) => node.id === "start").data.subtitle,
  "BOAS-VINDAS",
);
assert.equal(graph.nodes.find((n) => n.id === "q:email").selected, true);
assert.deepEqual(graph.nodes.find((n) => n.id === "q:email").position, {
  x: 130,
  y: 240,
});
assert.equal(
  graph.edges.find((e) => e.id === "q:investimento/rule:0").target,
  "stop:investimento:rule:0",
);
assert.equal(
  graph.edges.find((e) => e.id === "q:negocio/rule:0").target,
  "q:produto",
);
assert.equal(graph.edges.find((e) => e.id === "q:fim/default").target, "end");
assert.equal(
  graph.nodes.find((n) => n.id === "stop:investimento:rule:0").data.owner,
  "investimento",
);
assert.deepEqual(
  buildGraph(
    { definition: { ...definition, fields: [] } },
    "welcome",
  ).edges.map((e) => e.target),
  ["end"],
);

for (const target of ["q:email", "q:investimento", "q:missing", "start"]) {
  assert.throws(() =>
    connectFlow(definition.fields, {
      source: "q:investimento",
      sourceHandle: "default",
      target,
    }),
  );
}
assert.throws(() =>
  connectFlow(definition.fields, {
    source: "start",
    sourceHandle: "default",
    target: "q:produto",
  }),
);
assert.throws(() =>
  connectFlow(definition.fields, {
    source: "q:email",
    sourceHandle: "rule:20",
    target: "end",
  }),
);

let fields = connectFlow(definition.fields, {
  source: "q:investimento",
  sourceHandle: "rule:0",
  target: "end",
});
assert.deepEqual(fields[1].rules[0], {
  operator: "lt",
  value: "1000",
  target: "end:default",
});
assert.equal(
  definition.fields[1].rules[0].target,
  "finish",
  "Projection must not mutate the original",
);
assert.equal(
  buildGraph({ definition: { ...definition, fields } }, "").nodes.some((n) =>
    n.id.startsWith("stop:"),
  ),
  false,
);
assert.equal(
  globalThis.BadonFlow.next(fields, 1, { investimento: "500" }).index,
  -1,
);
// Run the exact graph-edited definition through the authoritative PHP validator.
const evaluate = (fields, answers) =>
  JSON.parse(
    execFileSync(
      php,
      [
        "-r",
        'require "app/domain.php"; $v=json_decode(stream_get_contents(STDIN),true); $d=clean_definition($v["fields"],"steps",default_ending()); echo json_encode(validate_flow($d,$v["answers"]));',
      ],
      { input: JSON.stringify({ fields, answers }), encoding: "utf8" },
    ),
  );
let result = evaluate(fields, {
  email: "a@example.invalid",
  investimento: "500",
  negocio: ["forged"],
});
assert.deepEqual(result[4], ["email", "investimento"]);
assert.equal(Object.keys(result[1]).length, 0);
assert.equal(result[3].kind, "completed");
assert.equal(result[3].ending.whatsapp, true);

fields = connectFlow(definition.fields, {
  source: "q:email",
  sourceHandle: "default",
  target: "q:produto",
});
result = evaluate(fields, {
  email: "a@example.invalid",
  produto: "Curso",
  investimento: ["forged"],
});
assert.deepEqual(result[4], ["email", "produto", "fim"]);
assert.deepEqual(
  globalThis.BadonFlow.path(fields, {
    email: "a@example.invalid",
    produto: "Curso",
  }).map((i) => fields[i].key),
  result[4],
);

fields = connectFlow(definition.fields, {
  source: "q:email",
  sourceHandle: "default",
  target: "stop:investimento:rule:0",
});
assert.equal(fields[0].otherwise.target, "finish");
assert.deepEqual(
  fields[0].otherwise.ending,
  definition.fields[1].rules[0].ending,
);
assert.notEqual(
  fields[0].otherwise.ending,
  definition.fields[1].rules[0].ending,
);
result = evaluate(fields, { email: "a@example.invalid" });
assert.deepEqual(result[4], ["email"]);
assert.equal(result[3].ending.whatsapp, false);
assert.equal(result[3].kind, "conditional");
assert.equal(
  buildGraph({ definition: { ...definition, fields } }, "").nodes.filter((n) =>
    n.id.startsWith("stop:"),
  ).length,
  2,
);

const invalid = structuredClone(definition);
invalid.fields[1].otherwise.target = "email";
assert.equal(buildGraph({ definition: invalid }, "").warnings.length, 1);
assert.equal(
  buildGraph({ definition: invalid }, "").edges.some(
    (e) => e.id === "q:investimento/default",
  ),
  false,
);
console.log(
  "OK: mapa, posições, conexões, ciclos bloqueados, finais e paridade React/JavaScript/PHP.",
);
