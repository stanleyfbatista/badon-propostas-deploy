import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Api, Person } from "./Crm";
import { blankTask, TaskItem } from "./task-model";
import { DateField, PersonField, PriorityField } from "./TaskControls";

export function QuickSubtask({
  parent,
  actor,
  people,
  workspace,
  api,
  disabled,
  created,
  onBusy,
  onDraft,
}: {
  parent: TaskItem;
  actor: string;
  people: Person[];
  workspace: number;
  api: Api;
  disabled: boolean;
  created: () => Promise<void>;
  onBusy: (v: boolean) => void;
  onDraft: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(() => blankTask(actor)),
    [error, setError] = useState("");
  const patch = (key: string, value: any) =>
    setDraft((d) => ({ ...d, [key]: value }));
  useEffect(() => {
    onDraft(
      open &&
        (!!draft.title.trim() ||
          draft.priority !== "normal" ||
          !!draft.due_date ||
          draft.assignee !== actor),
    );
  }, [
    open,
    draft.title,
    draft.priority,
    draft.due_date,
    draft.assignee,
    actor,
  ]);
  return (
    <>
      {!open ? (
        <button
          type="button"
          className="btn"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          <Plus size={16} /> Nova subtarefa
        </button>
      ) : (
        <form
          className="flow-subtask-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (disabled || !draft.title.trim()) return;
            onBusy(true);
            setError("");
            try {
              await api("task-create", {
                ...draft,
                workspace,
                parent_id: parent.id,
                project_id: parent.project_id,
                visibility: parent.visibility,
                assignee:
                  parent.visibility === "private" ? actor : draft.assignee,
              });
              await created();
              setDraft(blankTask(actor));
              setOpen(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              onBusy(false);
            }
          }}
        >
          <input
            autoFocus
            aria-label="Nome da subtarefa"
            placeholder="O que precisa ser feito?"
            required
            maxLength={200}
            disabled={disabled}
            value={draft.title}
            onChange={(e) => patch("title", e.target.value)}
          />
          <PriorityField
            label="Prioridade da subtarefa"
            value={draft.priority}
            onChange={(v) => patch("priority", v)}
            disabled={disabled}
          />
          <PersonField
            label="Responsável pela subtarefa"
            value={draft.assignee}
            people={people}
            onChange={(v) => patch("assignee", v)}
            disabled={disabled || parent.visibility === "private"}
          />
          <DateField
            label="Prazo da subtarefa"
            value={draft.due_date}
            onChange={(v) => patch("due_date", v)}
            disabled={disabled}
          />
          <div className="flow-subtask-actions">
            <button
              type="button"
              className="btn"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                setDraft(blankTask(actor));
                setError("");
              }}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={disabled || !draft.title.trim()}
            >
              Criar subtarefa
            </button>
          </div>
        </form>
      )}
      {disabled && !open && (
        <p className="flow-inline-notice">
          Salve as alterações da tarefa para adicionar uma subtarefa.
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </>
  );
}
