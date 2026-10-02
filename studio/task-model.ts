import { utcInput } from "./Crm";

export const taskStatuses: Record<string, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  review: "Em aprovação",
  done: "Concluída",
};
export const taskPriorities: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};
export type TaskItem = {
  id: number;
  revision: number;
  creator: string;
  title: string;
  description: string;
  visibility: "private" | "team";
  assignee: string | null;
  opportunity_id: number | null;
  opportunity_name?: string | null;
  opportunity_company?: string | null;
  status: string;
  priority: string;
  start_date?: string | null;
  due_date: string | null;
  checklist: { id: string; text: string; done: boolean }[];
  archived: number;
  create_key?: string;
};
export function todayLocal() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function dayBounds(day: string) {
  const next = new Date(day + "T00:00:00");
  next.setDate(next.getDate() + 1);
  const nextDay = [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
  return {
    start: utcInput(day + "T00:00:00")!,
    end: utcInput(nextDay + "T00:00:00")!,
  };
}
export const dueLabel = (date?: string | null) =>
  date ? date.split("-").reverse().join("/") : "—";
export function blankTask(actor: string): TaskItem {
  return {
    id: 0,
    revision: 1,
    creator: actor,
    title: "",
    description: "",
    visibility: "team",
    assignee: actor,
    opportunity_id: null,
    status: "todo",
    priority: "normal",
    start_date: null,
    due_date: null,
    checklist: [],
    archived: 0,
    create_key: crypto.randomUUID(),
  };
}
export type TaskGrouping = "status" | "date";
export function taskGroup(
  item: TaskItem,
  today: string,
  grouping: TaskGrouping,
) {
  if (grouping === "status") return item.status;
  if (item.status === "done") return "done";
  if (!item.due_date) return "undated";
  if (item.due_date < today) return "overdue";
  return item.due_date === today ? "today" : "upcoming";
}
export const dateGroups: Record<string, string> = {
  overdue: "Em atraso",
  today: "Hoje",
  upcoming: "Próximas",
  undated: "Sem prazo",
  done: "Concluídas",
};
