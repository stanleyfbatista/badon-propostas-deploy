// Calendar dates are civil days, not timestamps. UTC arithmetic avoids DST shifts.
export type AgendaView = "month" | "week" | "day" | "agenda";
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function addCalendarDays(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}
export function daysBetween(start: string, end: string) {
  return Math.round(
    (Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
      86400000,
  );
}
export function weekStart(day: string, monday = true) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  return addCalendarDays(day, -((weekday + (monday ? 6 : 0)) % 7));
}
export function agendaRange(day: string, view: AgendaView, monday = true) {
  const start =
    view === "month"
      ? weekStart(day.slice(0, 7) + "-01", monday)
      : view === "week"
        ? weekStart(day, monday)
        : view === "agenda"
          ? day.slice(0, 7) + "-01"
          : day;
  const count =
    view === "month"
      ? 42
      : view === "week"
        ? 7
        : view === "day"
          ? 1
          : new Date(
              Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0),
            ).getUTCDate();
  return Array.from({ length: count }, (_, i) => addCalendarDays(start, i));
}
export function navigateAgenda(day: string, view: AgendaView, delta: number) {
  if (view === "week" || view === "day")
    return addCalendarDays(day, delta * (view === "week" ? 7 : 1));
  const date = new Date(day.slice(0, 7) + "-01T12:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + delta);
  return dateKey(date);
}
export function isWeekend(day: string) {
  return [0, 6].includes(new Date(day + "T12:00:00Z").getUTCDay());
}
export function taskOnDay(
  task: { start_date?: string | null; due_date: string | null },
  day: string,
) {
  return (
    !!task.due_date &&
    (task.start_date || task.due_date) <= day &&
    task.due_date >= day
  );
}
export function shiftedTaskDates(
  task: { start_date?: string | null; due_date: string | null },
  from: string,
  to: string,
  resize = false,
) {
  if (!task.due_date)
    throw Error("Defina o vencimento antes de mover a demanda.");
  const delta = daysBetween(from, to);
  const start = task.start_date
    ? resize
      ? task.start_date
      : addCalendarDays(task.start_date, delta)
    : null;
  const due = resize ? to : addCalendarDays(task.due_date, delta);
  if (start && due < start)
    throw Error("O vencimento não pode vir antes do início.");
  return { start_date: start, due_date: due };
}
export function dayLabel(
  day: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
) {
  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(day + "T12:00:00Z"));
}
export function agendaTitle(day: string, view: AgendaView, monday = true) {
  if (view === "week") {
    const days = agendaRange(day, view, monday);
    return (
      dayLabel(days[0], { day: "numeric", month: "short" }) +
      " – " +
      dayLabel(days[6])
    );
  }
  return dayLabel(
    day,
    view === "day"
      ? { day: "numeric", month: "long", year: "numeric" }
      : { month: "long", year: "numeric" },
  );
}
export async function loadAgenda(api: any, query: object) {
  const items = new Map<number, any>();
  let people: any[] = [],
    total = 0;
  // Bounded load: no invisible pagination of a calendar. Excess is explicitly reported.
  for (let page = 1; page <= 10; page++) {
    const result = await api("flow-work", undefined, {
      ...query,
      calendar: "1",
      page,
    });
    total = Number(result.total);
    people = result.people || [];
    for (const task of result.items) items.set(Number(task.id), task);
    if (page * 200 >= total || !result.items.length) break;
  }
  return {
    items: [...items.values()],
    people,
    total,
    limited: total > items.size,
  };
}
