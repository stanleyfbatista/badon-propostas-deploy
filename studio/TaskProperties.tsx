import React from "react";
import {
  CalendarDays,
  CircleDot,
  Flag,
  Folder,
  LockKeyhole,
  Tag,
  Users,
} from "lucide-react";
import { Person } from "./Crm";
import { TaskItem } from "./task-model";
import {
  ChoiceField,
  DateField,
  PersonField,
  PriorityField,
  StatusField,
  TagsField,
} from "./TaskControls";

export function TaskProperties({
  item,
  people,
  actor,
  projects,
  extensions,
  datesReady,
  change,
}: {
  item: TaskItem;
  people: Person[];
  actor: string;
  projects: any[];
  extensions: boolean;
  datesReady: boolean;
  change: (key: keyof TaskItem, value: any) => void;
}) {
  const property = (
    label: string,
    icon: React.ReactNode,
    child: React.ReactNode,
  ) => (
    <div className="task-property">
      <span>
        {icon}
        {label}
      </span>
      {child}
    </div>
  );
  return (
    <div className="task-fields-grid task-properties">
      {property(
        "Status",
        <CircleDot size={15} />,
        <StatusField
          value={item.status}
          onChange={(v) => change("status", v)}
        />,
      )}
      {property(
        "Responsável",
        <Users size={15} />,
        <PersonField
          value={item.assignee}
          people={people}
          disabled={item.visibility === "private"}
          onChange={(v) => change("assignee", v)}
        />,
      )}
      {property(
        "Data inicial",
        <CalendarDays size={15} />,
        <DateField
          label="Data inicial"
          value={item.start_date}
          max={item.due_date || "2100-12-31"}
          disabled={!datesReady}
          onChange={(v) => change("start_date", v)}
        />,
      )}
      {property(
        "Vencimento",
        <CalendarDays size={15} />,
        <DateField
          label="Data de vencimento"
          value={item.due_date}
          min={item.start_date || "2000-01-01"}
          onChange={(v) => change("due_date", v)}
        />,
      )}
      {property(
        "Visibilidade",
        <LockKeyhole size={15} />,
        <ChoiceField
          label="Visibilidade"
          value={item.visibility}
          disabled={!!item.parent_id || (!!item.id && item.creator !== actor)}
          options={[
            { value: "team", label: "Equipe deste espaço" },
            { value: "private", label: "Particular — só você" },
          ]}
          onChange={(v) => {
            change("visibility", v);
            if (v === "private") change("assignee", actor);
          }}
        />,
      )}
      {property(
        "Prioridade",
        <Flag size={15} />,
        <PriorityField
          value={item.priority}
          onChange={(v) => change("priority", v)}
        />,
      )}
      {extensions && (
        <>
          {property(
            "Projeto",
            <Folder size={15} />,
            <ChoiceField
              label={
                item.parent_id ? "Projeto herdado da tarefa-mãe" : "Projeto"
              }
              value={String(item.project_id || "")}
              disabled={!!item.parent_id}
              searchable
              options={[
                { value: "", label: "Sem projeto" },
                ...projects.map((p) => ({
                  value: String(p.id),
                  label: `BD-${String(p.id).padStart(4, "0")} · ${p.name}`,
                })),
              ]}
              onChange={(v) => change("project_id", Number(v) || null)}
            />,
          )}
          {property(
            "Etiquetas",
            <Tag size={15} />,
            <TagsField
              value={item.extras?.tags || []}
              onChange={(v) =>
                change("extras", {
                  links: [],
                  cover: "",
                  ...item.extras,
                  tags: v,
                })
              }
            />,
          )}
        </>
      )}
    </div>
  );
}
