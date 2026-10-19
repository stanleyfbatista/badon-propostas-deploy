import React, { useRef, useState } from "react";
import { Api, Person } from "./Crm";
import { TaskItem, taskStatuses, todayLocal } from "./task-model";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  DateField,
  PersonField,
  PriorityField,
  StatusField,
  TagsField,
  ChoiceField,
} from "./TaskControls";
import { Deadline } from "./FlowWorkspace";

export type DeliveryGrouping = "status" | "client";
export function deliveryGroups(items: any[], grouping: DeliveryGrouping) {
  const groups = new Map<
    string,
    { id: string; name: string; tone: string; items: any[] }
  >();
  for (const item of items) {
    const id = grouping === "status" ? item.status : String(item.workspace_id);
    if (!groups.has(id))
      groups.set(id, {
        id,
        name:
          grouping === "status"
            ? taskStatuses[id] || id
            : item.client || "Sem cliente",
        tone: grouping === "status" ? id : "client",
        items: [],
      });
    groups.get(id)!.items.push(item);
  }
  return [...groups.values()].sort((a, b) =>
    grouping === "status"
      ? Object.keys(taskStatuses).indexOf(a.id) -
        Object.keys(taskStatuses).indexOf(b.id)
      : a.name.localeCompare(b.name, "pt-BR"),
  );
}

export function taskFieldUpdate(
  item: TaskItem,
  field: keyof TaskItem,
  value: any,
) {
  return { ...item, [field]: value };
}
export function FlowTaskTable({
  items,
  people,
  api,
  open,
  changed,
  disabled,
}: {
  items: any[];
  people: Person[];
  api: Api;
  open: (item: any) => void;
  changed: () => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState<number | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = useRef(false);
  const [grouping, setGrouping] = useState<DeliveryGrouping>("status");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    "status:done": true,
  });
  const [limits, setLimits] = useState<Record<string, number>>({});
  const groups = deliveryGroups(items, grouping);
  async function update(item: any, field: keyof TaskItem, value: any) {
    if (locked.current || disabled) return;
    locked.current = true;
    setBusy(item.id);
    setError("");
    setNotice("");
    try {
      await api("task-update", {
        ...taskFieldUpdate(item, field, value),
        workspace: item.workspace_id,
      });
      setNotice("Alteração salva.");
      changed();
    } catch (e) {
      setError((e as Error).message);
      changed();
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }
  return (
    <>
      <div className="flow-list-tools">
        <div className="flow-list-group-choice">
          <span>Agrupar por</span>
          <ChoiceField
            label="Agrupar demandas por"
            value={grouping}
            options={[
              { value: "status", label: "Status" },
              { value: "client", label: "Cliente" },
            ]}
            onChange={(v) => setGrouping(v as DeliveryGrouping)}
          />
        </div>
        <span className="muted">
          {items.length} demandas nesta página · {groups.length} grupos
        </span>
        <button
          type="button"
          className="flow-text-button"
          onClick={() =>
            setCollapsed(
              Object.fromEntries(
                groups.map((g) => [grouping + ":" + g.id, true]),
              ),
            )
          }
        >
          Recolher grupos
        </button>
        <button
          type="button"
          className="flow-text-button"
          onClick={() => setCollapsed({})}
        >
          Expandir grupos
        </button>
      </div>
      <p className="flow-inline-notice" role="status">
        {busy
          ? "Salvando alteração…"
          : notice ||
            "Edite os campos direto na lista. Abra o nome para ver a tarefa completa."}
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <div
        className="flow-inline-scroll"
        tabIndex={0}
        aria-label="Lista de demandas com edição rápida"
      >
        <table className="flow-inline-table">
          <colgroup>
            <col style={{ width: "26%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              {[
                "Demanda / cliente",
                "Status",
                "Prioridade",
                "Responsável",
                "Início",
                "Vencimento",
                "Etiquetas",
              ].map((s) => (
                <th key={s} scope="col">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => {
            const key = grouping + ":" + group.id;
            const limit = limits[key] || 10;
            return (
              <tbody key={key}>
                <tr className="flow-group-row">
                  <th colSpan={7} scope="rowgroup">
                    <button
                      type="button"
                      className="flow-group-toggle"
                      aria-expanded={!collapsed[key]}
                      onClick={() =>
                        setCollapsed((v) => ({ ...v, [key]: !v[key] }))
                      }
                    >
                      {collapsed[key] ? (
                        <ChevronRight size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      <span className={"flow-group-name group-" + group.tone}>
                        {group.name}
                      </span>
                      <span className="flow-group-count">
                        {group.items.length}{" "}
                        {group.items.length === 1 ? "demanda" : "demandas"}
                      </span>
                    </button>
                  </th>
                </tr>
                {!collapsed[key] &&
                  group.items.slice(0, limit).map((t) => {
                    const off = disabled || busy !== null;
                    const owners = people.filter(
                      (p) =>
                        p.actor.startsWith("a:") ||
                        !p.workspace_ids ||
                        p.workspace_ids.includes(Number(t.workspace_id)),
                    );
                    return (
                      <tr key={t.id}>
                        <td>
                          <button
                            type="button"
                            className="flow-table-title"
                            title={t.title}
                            disabled={off}
                            onClick={() => open(t)}
                          >
                            {t.title}
                          </button>
                          <small
                            title={`${t.client || ""} · ${t.project_name || "Sem projeto"}`}
                          >
                            {t.parent_id ? "↳ Subtarefa · " : ""}
                            {t.client} · {t.project_name || "Sem projeto"}
                          </small>
                        </td>
                        <td>
                          <StatusField
                            label={"Status de " + t.title}
                            value={t.status}
                            disabled={off}
                            onChange={(v) => void update(t, "status", v)}
                          />
                        </td>
                        <td>
                          <PriorityField
                            label={"Prioridade de " + t.title}
                            value={t.priority}
                            disabled={off}
                            onChange={(v) => void update(t, "priority", v)}
                          />
                        </td>
                        <td>
                          <PersonField
                            label={"Responsável por " + t.title}
                            value={t.assignee}
                            people={owners}
                            disabled={off || t.visibility === "private"}
                            onChange={(v) => void update(t, "assignee", v)}
                          />
                        </td>
                        <td>
                          <DateField
                            label={"Início de " + t.title}
                            value={t.start_date}
                            max={t.due_date || "2100-12-31"}
                            disabled={off}
                            onChange={(v) => void update(t, "start_date", v)}
                          />
                        </td>
                        <td>
                          <DateField
                            label={"Vencimento de " + t.title}
                            value={t.due_date}
                            min={t.start_date || "2000-01-01"}
                            disabled={off}
                            onChange={(v) => void update(t, "due_date", v)}
                          />
                          {t.status !== "done" &&
                            t.due_date &&
                            Math.round(
                              (new Date(t.due_date + "T12:00:00").getTime() -
                                new Date(
                                  todayLocal() + "T12:00:00",
                                ).getTime()) /
                                86400000,
                            ) <= 3 && <Deadline item={t} />}
                        </td>
                        <td>
                          <TagsField
                            label={"Etiquetas de " + t.title}
                            value={t.extras?.tags || []}
                            disabled={off}
                            onChange={(v) =>
                              void update(t, "extras", {
                                links: [],
                                cover: "",
                                ...t.extras,
                                tags: v,
                              })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                {!collapsed[key] && group.items.length > 10 && (
                  <tr className="flow-group-more">
                    <td colSpan={7}>
                      <span>
                        {Math.min(limit, group.items.length)} de{" "}
                        {group.items.length} demandas
                      </span>
                      {limit < group.items.length && (
                        <button
                          type="button"
                          className="flow-text-button"
                          onClick={() =>
                            setLimits((v) => ({ ...v, [key]: limit + 10 }))
                          }
                        >
                          Mostrar mais 10
                        </button>
                      )}
                      {limit > 10 && (
                        <button
                          type="button"
                          className="flow-text-button"
                          onClick={() =>
                            setLimits((v) => ({ ...v, [key]: 10 }))
                          }
                        >
                          Mostrar menos
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
        {!items.length && (
          <p className="flow-empty">Nenhuma demanda neste filtro.</p>
        )}
      </div>
    </>
  );
}
