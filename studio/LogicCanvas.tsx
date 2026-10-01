import React, { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
  type Connection,
} from "@xyflow/react";
import {
  Type,
  Mail,
  Phone,
  ListChecks,
  Hash,
  Calendar,
  Flag,
  Play,
  Network,
} from "lucide-react";
import { buildGraph, connectFlow, type FlowCard } from "./logic-model";
import { types, type Draft, type Field } from "./types";
import "@xyflow/react/dist/style.css";
import "./logic.css";

type CardNode = Node<FlowCard, "card">;
function Card({ id, data, selected, isConnectable }: NodeProps<CardNode>) {
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data, updateNodeInternals]);
  const Icon =
    data.kind === "ending"
      ? Flag
      : data.kind === "start"
        ? Play
        : {
            email: Mail,
            tel: Phone,
            number: Hash,
            date: Calendar,
            single: ListChecks,
            select: ListChecks,
            yesno: ListChecks,
            multiple: ListChecks,
          }[data.type || ""] || Type;
  return (
    <div className={`flow-card ${data.kind} ${selected ? "active" : ""}`}>
      {data.kind !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          id="in"
          isConnectable={isConnectable}
          aria-label={`Destino: ${data.title}`}
        />
      )}
      <div className="flow-card-heading">
        <span className="flow-card-icon">
          <Icon size={23} />
        </span>
        <div>
          <small>
            {data.subtitle}
            {data.type ? ` · ${types[data.type] || data.type}` : ""}
          </small>
          <strong title={data.title}>{data.title}</strong>
        </div>
      </div>
      {data.ports.map((port) => (
        <div
          className={`flow-port ${port.conditional ? "conditional" : ""}`}
          key={port.id}
        >
          <span>{port.label}</span>
          <Handle
            type="source"
            position={port.conditional ? Position.Right : Position.Bottom}
            id={port.id}
            isConnectable={isConnectable && data.kind !== "start"}
            aria-label={`Saída: ${port.label}`}
          />
        </div>
      ))}
    </div>
  );
}
const nodeTypes = { card: Card };

export function LogicCanvas({
  draft,
  selected,
  editable,
  onSelect,
  onFields,
  onLayout,
}: {
  draft: Draft;
  selected: string;
  editable: boolean;
  onSelect: (key: string) => void;
  onFields: (fields: Field[]) => void;
  onLayout: (layout: NonNullable<Draft["layout"]>) => void;
}) {
  const graph = useMemo(() => buildGraph(draft, selected), [draft, selected]);
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(graph.nodes);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setNodes((previous) =>
      graph.nodes.map((node) => ({
        ...node,
        measured: previous.find((p) => p.id === node.id)?.measured,
      })),
    );
  }, [graph.nodes, setNodes]);
  const connect = (connection: Connection) => {
    if (!editable) return;
    try {
      onFields(connectFlow(draft.definition.fields, connection));
      setNotice(
        connection.target.startsWith("stop:")
          ? "Encerramento copiado para esta saída. Edite sua mensagem nas propriedades."
          : "Caminho alterado. Salve o rascunho e publique para atualizar o formulário.",
      );
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  return (
    <section className="logic-area" aria-label="Mapa de lógica do formulário">
      <div className="logic-toolbar">
        <div>
          <Network size={18} />
          <strong>Mapa do funil</strong>
        </div>
        {editable && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              onLayout({});
              setNotice("Blocos organizados. As regras foram preservadas.");
            }}
          >
            Organizar mapa
          </button>
        )}
      </div>
      <p className="logic-help">
        Clique em uma pergunta para criar condições. Arraste uma saída até outra
        pergunta ou final. As condições são avaliadas de cima para baixo.
      </p>
      {graph.warnings.length > 0 && (
        <div className="logic-warning" role="alert">
          {graph.warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </div>
      )}
      <div className="logic-board">
        <ReactFlow<CardNode>
          nodes={nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            // Persist both pointer drags and accessible keyboard moves, only when finished.
            const layout = Object.fromEntries(
              graph.nodes.map((node) => [node.id, node.position]),
            );
            let moved = false;
            for (const change of changes) {
              if (
                change.type === "position" &&
                !change.dragging &&
                change.position
              ) {
                layout[change.id] = change.position;
                moved = true;
              }
            }
            if (editable && moved) onLayout(layout);
          }}
          onNodeClick={(_, node) => {
            onSelect(node.data.owner);
            setNotice(
              node.data.rule
                ? `Edite ${node.data.rule === "default" ? "o final de “Caso contrário”" : `o final da condição ${Number(node.data.rule.slice(5)) + 1}`} no painel de propriedades.`
                : "",
            );
          }}
          onConnect={connect}
          onReconnect={(_, connection) => connect(connection)}
          isValidConnection={(connection) => {
            if (!editable) return false;
            try {
              connectFlow(draft.definition.fields, connection);
              return true;
            } catch {
              return false;
            }
          }}
          nodesDraggable={editable}
          nodesConnectable={editable}
          edgesReconnectable={editable}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 0.95 }}
          minZoom={0.15}
          maxZoom={1.6}
          nodeExtent={[
            [-1000000, -1000000],
            [1000000, 1000000],
          ]}
          onlyRenderVisibleElements
          ariaLabelConfig={{
            "controls.zoomIn.ariaLabel": "Aumentar zoom",
            "controls.zoomOut.ariaLabel": "Diminuir zoom",
            "controls.fitView.ariaLabel": "Enquadrar mapa",
          }}
        >
          <Background gap={22} size={1.3} color="#d9e2ef" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) =>
              node.data.kind === "ending" ? "#93dfb4" : "#c4d7f2"
            }
            ariaLabel="Visão geral do funil"
          />
        </ReactFlow>
      </div>
      <p className="logic-status" role="status">
        {notice ||
          "Mover blocos altera apenas a organização visual. Use a lista de perguntas para mudar a ordem. Conexões permitem somente avanços, sem ciclos."}
      </p>
    </section>
  );
}
