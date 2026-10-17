import React, { useRef, useState } from "react";
import { Api, Person } from "./Crm";
import { TaskItem, todayLocal } from "./task-model";
import {
  DateField,
  PersonField,
  PriorityField,
  StatusField,
  TagsField,
} from "./TaskControls";
import { Deadline } from "./FlowWorkspace";

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
      <p className="flow-inline-notice" role="status">
        {busy
          ? "Salvando alteração…"
          : notice ||
            "Clique em uma informação para editar. As alterações desta lista são salvas automaticamente."}
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
          <tbody>
            {items.map((t) => {
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
                      disabled={off}
                      onClick={() => open(t)}
                    >
                      {t.title}
                    </button>
                    <small>
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
                          new Date(todayLocal() + "T12:00:00").getTime()) /
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
          </tbody>
        </table>
        {!items.length && (
          <p className="flow-empty">Nenhuma demanda neste filtro.</p>
        )}
      </div>
    </>
  );
}
