import type { Draft, Field, Route } from "./types";

export const comparisons: Record<string, string> = {
  eq: "igual a",
  ne: "diferente de",
  lt: "menor que",
  lte: "menor ou igual a",
  gt: "maior que",
  gte: "maior ou igual a",
};
export type FlowPort = { id: string; label: string; conditional: boolean };
export type FlowCard = {
  kind: "start" | "question" | "ending";
  title: string;
  subtitle: string;
  owner: string;
  ports: FlowPort[];
  type?: string;
  rule?: string;
};
export type GraphNode = {
  id: string;
  type: "card";
  position: { x: number; y: number };
  data: FlowCard;
  selected: boolean;
};
export type GraphEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  type: "smoothstep";
  label?: string;
  reconnectable: "target" | false;
  style: { stroke: string; strokeWidth: number };
};
const stopId = (key: string, port: string) => `stop:${key}:${port}`;

// The graph is a projection of the public flow, not a second rule engine.
export function buildGraph(draft: Draft, selected: string) {
  const fields = draft.definition.fields;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const warnings: string[] = [];
  const positions = new Map(fields.map((f, i) => [f.key, i]));
  const addNode = (id: string, data: FlowCard, x: number, y: number) => {
    nodes.push({
      id,
      type: "card",
      data,
      position: draft.layout?.[id] || { x, y },
      selected: data.owner === selected && !id.startsWith("stop:"),
    });
  };
  const addEdge = (
    source: string,
    port: string,
    target: string,
    label?: string,
  ) => {
    edges.push({
      id: `${source}/${port}`,
      source,
      sourceHandle: port,
      target,
      label,
      type: "smoothstep",
      reconnectable: source === "start" ? false : "target",
      style: {
        stroke: port.startsWith("rule:") ? "#075bc5" : "#8395ad",
        strokeWidth: 2,
      },
    });
  };
  const welcomeEnabled =
    draft.definition.welcome?.enabled ?? !!draft.definition.welcome?.title;
  addNode(
    "start",
    {
      kind: "start",
      title: welcomeEnabled
        ? draft.definition.welcome?.title || "Bem-vindo!"
        : "Início do formulário",
      subtitle: welcomeEnabled ? "BOAS-VINDAS" : "CAPA DESATIVADA",
      owner: "welcome",
      ports: [{ id: "default", label: "Começar", conditional: false }],
    },
    0,
    0,
  );
  addEdge("start", "default", fields.length ? `q:${fields[0].key}` : "end");
  let y = 210;
  fields.forEach((field, index) => {
    const routes = [
      ...field.rules.map((rule, i) => ({
        port: `rule:${i}`,
        route: rule,
        label: `${i + 1}. Se ${comparisons[rule.operator] || rule.operator} “${rule.value || "…"}”`,
      })),
      {
        port: "default",
        route: field.otherwise,
        label: field.rules.length ? "Caso contrário" : "Próximo passo",
      },
    ];
    addNode(
      `q:${field.key}`,
      {
        kind: "question",
        title: field.label,
        subtitle: `${index + 1}`,
        type: field.type,
        owner: field.key,
        ports: routes.map((r) => ({
          id: r.port,
          label: r.label,
          conditional: r.port !== "default",
        })),
      },
      0,
      y,
    );
    let stops = 0;
    routes.forEach(({ port, route, label }) => {
      let target: string;
      if (route.target === "finish") {
        target = stopId(field.key, port);
        addNode(
          target,
          {
            kind: "ending",
            title: route.ending?.title || "Encerramento personalizado",
            subtitle:
              port === "default"
                ? "FINAL • CASO CONTRÁRIO"
                : `FINAL • CONDIÇÃO ${Number(port.split(":")[1]) + 1}`,
            owner: field.key,
            rule: port,
            ports: [],
          },
          440,
          y + stops++ * 180,
        );
      } else if (route.target === "end:default") {
        target = "end";
      } else if (route.target === "next") {
        target = fields[index + 1] ? `q:${fields[index + 1].key}` : "end";
      } else {
        const destination = positions.get(route.target);
        if (destination === undefined || destination <= index) {
          warnings.push(
            `“${field.label}”: ${label} tem um destino inválido. Escolha uma pergunta posterior ou um final.`,
          );
          return;
        }
        target = `q:${route.target}`;
      }
      addEdge(
        `q:${field.key}`,
        port,
        target,
        port === "default"
          ? undefined
          : `Condição ${Number(port.split(":")[1]) + 1}`,
      );
    });
    y += Math.max(260 + field.rules.length * 42, stops * 180 + 80);
  });
  addNode(
    "end",
    {
      kind: "ending",
      title: draft.definition.completion.title,
      subtitle: "FINAL PADRÃO",
      owner: "ending",
      ports: [],
    },
    0,
    y,
  );
  return { nodes, edges, warnings };
}

export type FlowConnection = {
  source: string | null;
  sourceHandle?: string | null;
  target: string | null;
};
export function connectFlow(
  fields: Field[],
  connection: FlowConnection,
): Field[] {
  const { source, sourceHandle, target } = connection;
  const index = fields.findIndex((f) => source === `q:${f.key}`);
  if (index < 0 || !sourceHandle || !target)
    throw new Error("Selecione uma saída de uma pergunta.");
  const field = fields[index];
  const ruleIndex = /^rule:\d+$/.test(sourceHandle)
    ? Number(sourceHandle.slice(5))
    : -1;
  if (sourceHandle !== "default" && (ruleIndex < 0 || !field.rules[ruleIndex]))
    throw new Error("Condição não encontrada.");
  let route: Route;
  if (target === "end") route = { target: "end:default" };
  else if (target.startsWith("q:")) {
    const destination = fields.findIndex((f) => target === `q:${f.key}`);
    if (destination <= index)
      throw new Error(
        "Conecte a uma pergunta posterior. Retornos criariam um ciclo.",
      );
    route = { target: fields[destination].key };
  } else {
    const match = /^stop:([a-z][a-z0-9_]*):(default|rule:\d+)$/.exec(target);
    const owner = fields.find((f) => f.key === match?.[1]);
    const original =
      match?.[2] === "default"
        ? owner?.otherwise
        : owner?.rules[Number(match?.[2].slice(5))];
    if (!original || original.target !== "finish" || !original.ending)
      throw new Error("Escolha uma pergunta ou um encerramento válido.");
    // Each route owns its ending; linking an existing one copies its current content.
    route = { target: "finish", ending: { ...original.ending } };
  }
  return fields.map((f, i) =>
    i !== index
      ? f
      : sourceHandle === "default"
        ? { ...f, otherwise: route }
        : {
            ...f,
            rules: f.rules.map((r, j) => {
              if (j !== ruleIndex) return r;
              return { operator: r.operator, value: r.value, ...route };
            }),
          },
  );
}
