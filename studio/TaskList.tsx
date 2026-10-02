import React, { useRef, useState } from "react";
import {
  Check,
  Plus,
  LockKeyhole,
  ListChecks,
  MessageSquare,
  AlignLeft,
} from "lucide-react";
import { Api, Avatar, Person } from "./Crm";
import {
  TaskItem,
  TaskGrouping,
  taskGroup,
  taskStatuses,
  taskPriorities,
  dateGroups,
  dueLabel,
  blankTask,
} from "./task-model";

export function QuickTask({
  api,
  workspace,
  actor,
  disabled,
  created,
  day = false,
}: {
  api: Api;
  workspace: number;
  actor: string;
  disabled: boolean;
  day?: boolean;
  created: (id: number) => void;
}) {
  const [draft, setDraft] = useState(() => blankTask(actor));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const title = useRef<HTMLInputElement>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current || disabled || !draft.title.trim()) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api("task-create", { ...draft, workspace });
      setDraft(blankTask(actor));
      created(Number(result.id));
      title.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="task-quick-box">
      <form
        className="task-quick"
        aria-label="Adicionar tarefa na lista"
        onSubmit={submit}
      >
        <fieldset disabled={disabled || busy}>
          <label className="task-quick-title">
            <span>Nova tarefa</span>
            <input
              ref={title}
              required
              maxLength={200}
              placeholder="O que precisa ser feito?"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {Object.entries(taskStatuses)
                .filter(([key]) => !day || key !== "done")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>Vencimento</span>
            <input
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={draft.due_date || ""}
              onChange={(e) =>
                setDraft({ ...draft, due_date: e.target.value || null })
              }
            />
          </label>
          <button className="btn primary" disabled={!draft.title.trim()}>
            <Plus size={16} />
            {busy ? "Adicionando…" : "Adicionar"}
          </button>
        </fieldset>
      </form>
      <small>
        Responsável: você · Compartilhada com a equipe deste espaço. Abra a
        tarefa para acrescentar detalhes, checklist ou torná-la particular.
      </small>
      {error && (
        <p className="notice error" role="alert">
          {error} Seus dados foram mantidos; você pode tentar novamente.
        </p>
      )}
    </div>
  );
}

export function TaskList({
  items,
  people,
  today,
  grouping,
  editable,
  busy,
  archived,
  statusFilter = "",
  open,
  update,
  openOpportunity,
  add,
}: {
  items: TaskItem[];
  people: Person[];
  today: string;
  grouping: TaskGrouping;
  editable: boolean;
  busy: boolean;
  archived: boolean;
  statusFilter?: string;
  open: (item: TaskItem) => void;
  update: (item: TaskItem, changes: Partial<TaskItem>) => void;
  openOpportunity: (id: number) => void;
  add: (status: string, due: string | null) => void;
}) {
  const groups = grouping === "status" ? taskStatuses : dateGroups;
  return (
    <div className="task-list" aria-busy={busy}>
      {Object.entries(groups)
        .filter(([key]) =>
          grouping === "date"
            ? items.some((item) => taskGroup(item, today, grouping) === key)
            : !statusFilter || statusFilter === key,
        )
        .map(([key, label]) => {
          const rows = items.filter(
            (item) => taskGroup(item, today, grouping) === key,
          );
          return (
            <details
              key={grouping + key}
              className={"task-list-group group-" + key}
              open
            >
              <summary>
                <span className="task-group-dot" />
                {label}
                <span className="task-group-count">{rows.length}</span>
                <small>nesta página</small>
              </summary>
              <div
                className="task-table-scroll"
                role="region"
                aria-label={"Lista: " + label}
                tabIndex={0}
              >
                <table className="task-table">
                  <caption className="task-sr-only">
                    {label}: tarefas e suas informações
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Tarefa",
                        "Cliente / oportunidade",
                        "Status",
                        "Responsável",
                        "Data inicial",
                        "Vencimento",
                        "Prioridade",
                        "Detalhes",
                      ].map((title) => (
                        <th scope="col" key={title}>
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const person = people.find(
                        (p) => p.actor === item.assignee,
                      );
                      const late =
                        item.status !== "done" &&
                        !!item.due_date &&
                        item.due_date < today;
                      const writable = editable && !item.archived && !busy;
                      return (
                        <tr key={item.id} className={"task-" + item.status}>
                          <td>
                            <div className="task-row-name">
                              <button
                                className={
                                  "task-check " +
                                  (item.status === "done" ? "checked" : "")
                                }
                                disabled={!writable}
                                aria-label={
                                  (item.status === "done"
                                    ? "Reabrir tarefa: "
                                    : "Concluir tarefa: ") + item.title
                                }
                                onClick={() =>
                                  update(item, {
                                    status:
                                      item.status === "done" ? "todo" : "done",
                                  })
                                }
                              >
                                {item.status === "done" && <Check size={14} />}
                              </button>
                              <div>
                                <button
                                  className="task-title"
                                  disabled={busy}
                                  onClick={() => open(item)}
                                  aria-label={"Abrir tarefa: " + item.title}
                                >
                                  {item.title}
                                </button>
                                <div className="task-row-meta">
                                  {item.visibility === "private" && (
                                    <span>
                                      <LockKeyhole size={12} /> Particular
                                    </span>
                                  )}
                                  {!!item.description && (
                                    <span title="Possui descrição">
                                      <AlignLeft size={12} />
                                      <span className="task-sr-only">
                                        Com descrição
                                      </span>
                                    </span>
                                  )}
                                  {!!item.checklist.length && (
                                    <span>
                                      <ListChecks size={12} />
                                      {
                                        item.checklist.filter((c) => c.done)
                                          .length
                                      }
                                      /{item.checklist.length}
                                      <span className="task-sr-only">
                                        {" "}
                                        itens do checklist concluídos
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {item.opportunity_id ? (
                              <button
                                className="task-client"
                                disabled={busy}
                                onClick={() =>
                                  openOpportunity(Number(item.opportunity_id))
                                }
                                title={
                                  item.opportunity_name || "Abrir oportunidade"
                                }
                              >
                                {item.opportunity_company ||
                                  item.opportunity_name ||
                                  "Oportunidade vinculada"}
                              </button>
                            ) : (
                              <span className="muted">Sem vínculo</span>
                            )}
                          </td>
                          <td>
                            <select
                              className={"task-status status-" + item.status}
                              aria-label={"Status: " + item.title}
                              value={item.status}
                              disabled={!writable}
                              onChange={(e) =>
                                update(item, { status: e.target.value })
                              }
                            >
                              {Object.entries(taskStatuses).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="task-cell-button task-owner"
                              onClick={() => open(item)}
                              disabled={busy}
                              aria-label={"Responsável de " + item.title}
                            >
                              {person ? (
                                <>
                                  <Avatar person={person} />
                                  <span>{person.name || person.email}</span>
                                </>
                              ) : (
                                <span>Sem responsável</span>
                              )}
                            </button>
                          </td>
                          <td>
                            <button
                              className="task-cell-button task-date"
                              disabled={busy}
                              onClick={() => open(item)}
                              aria-label={
                                "Data inicial de " +
                                item.title +
                                ": " +
                                dueLabel(item.start_date)
                              }
                            >
                              {dueLabel(item.start_date)}
                            </button>
                          </td>
                          <td>
                            <button
                              className={
                                "task-cell-button task-date " +
                                (late ? "task-late" : "")
                              }
                              disabled={busy}
                              onClick={() => open(item)}
                              aria-label={
                                "Vencimento de " +
                                item.title +
                                ": " +
                                dueLabel(item.due_date)
                              }
                            >
                              {dueLabel(item.due_date)}
                              {late && <small>Em atraso</small>}
                            </button>
                          </td>
                          <td>
                            <select
                              className={
                                "task-row-priority priority-" + item.priority
                              }
                              aria-label={"Prioridade: " + item.title}
                              value={item.priority}
                              disabled={!writable}
                              onChange={(e) =>
                                update(item, { priority: e.target.value })
                              }
                            >
                              {Object.entries(taskPriorities).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="task-cell-button"
                              onClick={() => open(item)}
                              disabled={busy}
                              aria-label={
                                "Comentários e detalhes: " + item.title
                              }
                            >
                              <MessageSquare size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!rows.length && (
                <p className="task-group-empty">Nenhuma tarefa nesta etapa.</p>
              )}
              {editable && !archived && (
                <button
                  className="task-add-row"
                  disabled={busy}
                  onClick={() =>
                    add(
                      grouping === "status" ? key : "todo",
                      key === "today" ? today : null,
                    )
                  }
                >
                  <Plus size={15} />
                  Adicionar tarefa {grouping === "status" ? "· " + label : ""}
                </button>
              )}
            </details>
          );
        })}
    </div>
  );
}
