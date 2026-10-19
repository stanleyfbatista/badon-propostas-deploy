import React, { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings2,
  GripVertical,
} from "lucide-react";
import { Api, Avatar, Modal, Person } from "./Crm";
import { ChoiceField, DateField } from "./TaskControls";
import { useDeliveryDialog } from "./FlowWorkspace";
import { GoogleConnection } from "./GoogleConnection";
import { taskStatuses, todayLocal } from "./task-model";
import {
  AgendaView,
  agendaRange,
  agendaTitle,
  dayLabel,
  isWeekend,
  loadAgenda,
  navigateAgenda,
  shiftedTaskDates,
  taskOnDay,
} from "./agenda-model";
import "./agenda.css";

const views: Record<AgendaView, string> = {
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Lista",
};
type Props = {
  api: Api;
  actor: string;
  spaces: { id: number; name: string }[];
  workspace?: number;
  project?: number;
  embedded?: boolean;
};
type Draft = { task: any; start_date: string | null; due_date: string };

export function FlowAgenda(props: Props) {
  const {
    api,
    actor,
    spaces,
    workspace = 0,
    project = 0,
    embedded = false,
  } = props;
  const [day, setDay] = useState(todayLocal),
    [view, setView] = useState<AgendaView>("month");
  const [client, setClient] = useState(workspace),
    [search, setSearch] = useState(""),
    [assignee, setAssignee] = useState(""),
    [status, setStatus] = useState("");
  const [weekends, setWeekends] = useState(true),
    [monday, setMonday] = useState(true),
    [hideDone, setHideDone] = useState(false),
    [settings, setSettings] = useState(false),
    [google, setGoogle] = useState(false);
  const [data, setData] = useState<{
      items: any[];
      people: Person[];
      total: number;
      limited: boolean;
    } | null>(null),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(""),
    [notice, setNotice] = useState("");
  const [dropDay, setDropDay] = useState<string | null>(null);
  const drag = useRef<{ task: any; from: string; resize: boolean } | null>(
      null,
    ),
    lock = useRef(false);
  const refresh = () => {
    setLoading(true);
    setRevision((r) => r + 1);
  };
  const editor = useDeliveryDialog(props, refresh);
  const range = agendaRange(day, view, monday),
    from = range[0],
    to = range[range.length - 1];
  const visibleDays = range.filter(
    (d) => weekends || view === "day" || !isWeekend(d),
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      loadAgenda(api, {
        workspace: client,
        project,
        search,
        assignee,
        status,
        from,
        to,
        hide_done: hideDone ? "1" : "0",
      })
        .then((r) => {
          if (active) setData(r);
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setData(null);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    api,
    client,
    project,
    search,
    assignee,
    status,
    from,
    to,
    hideDone,
    revision,
    view,
    monday,
  ]);
  const disabled = loading || saving || editor.busy;
  const items = data?.items || [],
    people = data?.people || [];
  const shown = items.filter((t) => visibleDays.some((d) => taskOnDay(t, d)));
  const onDay = (d: string) => items.filter((t) => taskOnDay(t, d));
  const hiddenWeekend = items.length - shown.length;
  function setPeriod(next: string) {
    if (next !== day) {
      setDay(next);
    }
  }
  function changeView(next: AgendaView) {
    if (next !== view) {
      setLoading(true);
      setView(next);
    }
  }
  function editDates(
    task: any,
    dates = { start_date: task.start_date || null, due_date: task.due_date },
  ) {
    if (disabled || task.status === "done") return;
    setSaveError("");
    setDraft({ task, ...dates });
  }
  function drop(d: string) {
    const moving = drag.current;
    drag.current = null;
    setDropDay(null);
    if (!moving || disabled) return;
    try {
      const dates = shiftedTaskDates(
        moving.task,
        moving.from,
        d,
        moving.resize,
      );
      if (
        dates.due_date !== moving.task.due_date ||
        dates.start_date !== (moving.task.start_date || null)
      )
        editDates(moving.task, dates);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveDates() {
    if (!draft || lock.current) return;
    lock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await api("task-reschedule", {
        workspace: draft.task.workspace_id,
        id: draft.task.id,
        revision: draft.task.revision,
        start_date: draft.start_date,
        due_date: draft.due_date,
      });
      setNotice("Datas salvas. A demanda e sua agenda usam o mesmo prazo.");
      setDraft(null);
      refresh();
    } catch (e) {
      setSaveError((e as Error).message);
      refresh();
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  function chip(task: any, d: string, compact = true) {
    const late = task.status !== "done" && task.due_date < todayLocal();
    const movable = !disabled && task.status !== "done";
    const owner = people.find((p) => p.actor === task.assignee);
    const title = `${task.title} · ${task.client} · ${taskStatuses[task.status]} · Vence ${dayLabel(task.due_date)}`;
    return (
      <div
        key={task.id}
        className={`agenda-event status-${task.status}${late ? " overdue" : ""}${compact ? " compact" : ""}`}
        draggable={movable}
        onDragStart={(e) => {
          if (!movable) {
            e.preventDefault();
            return;
          }
          drag.current = { task, from: d, resize: false };
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", "badon-demand");
        }}
        onDragEnd={() => {
          drag.current = null;
          setDropDay(null);
        }}
      >
        <button
          className="agenda-event-open"
          disabled={disabled}
          title={title}
          onClick={() => void editor.open(task)}
        >
          <span className="agenda-status-dot" aria-hidden="true" />
          <span>
            <strong>
              {task.parent_id ? "↳ " : ""}
              {task.title}
            </strong>
            <small>
              {task.client}
              {!compact && ` · ${task.project_name || "Sem projeto"}`}
            </small>
            {!compact && (
              <small>
                {taskStatuses[task.status]} ·{" "}
                {task.start_date
                  ? `${dayLabel(task.start_date, { day: "numeric", month: "short" })} – `
                  : "Vence "}
                {dayLabel(task.due_date, { day: "numeric", month: "short" })}
                {late ? " · Em atraso" : ""}
              </small>
            )}
          </span>
          {!compact && owner && <Avatar person={owner} />}
        </button>
        {task.status !== "done" && (
          <button
            className="agenda-event-date"
            disabled={disabled}
            aria-label={`Alterar datas de ${task.title}`}
            title="Alterar datas (ou arraste esta borda para mudar o vencimento)"
            draggable={movable}
            onDragStart={(e) => {
              e.stopPropagation();
              drag.current = { task, from: d, resize: true };
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", "badon-demand");
            }}
            onClick={() => editDates(task)}
          >
            <GripVertical size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
  return (
    <section className="flow-page agenda-page">
      {!embedded && (
        <div className="flow-heading">
          <div>
            <p className="eyebrow">/ ESPAÇO DE TRABALHO /</p>
            <h1>Tempo para fazer acontecer.</h1>
            <p className="muted">
              Prazos, projetos e próximos passos. Sua operação no mesmo
              calendário.
            </p>
          </div>
        </div>
      )}
      <div className="agenda-filters">
        <label className="crm-search">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Buscar na agenda"
            placeholder="Buscar demanda ou projeto…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </label>
        {!workspace && (
          <ChoiceField
            label="Filtrar cliente na agenda"
            value={String(client)}
            searchable
            options={[
              { value: "0", label: "Todos os clientes" },
              ...spaces.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
            onChange={(v) => {
              setClient(Number(v));
              setAssignee("");
            }}
          />
        )}
        <ChoiceField
          label="Filtrar responsável na agenda"
          value={assignee}
          searchable
          options={[
            { value: "", label: "Todos os responsáveis" },
            ...people.map((p) => ({
              value: p.actor,
              label: p.name || p.email,
              person: p,
            })),
          ]}
          onChange={(v) => {
            setAssignee(v);
          }}
        />
        <ChoiceField
          label="Filtrar status na agenda"
          value={status}
          options={[
            { value: "", label: "Todos os status" },
            ...Object.entries(taskStatuses).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          onChange={(v) => {
            setStatus(v);
          }}
        />
        <button
          className="flow-text-button"
          aria-pressed={assignee === actor}
          onClick={() => {
            setAssignee(assignee === actor ? "" : actor);
          }}
        >
          Minhas demandas
        </button>
        {(search || (!workspace && client) || assignee || status) && (
          <button
            className="flow-text-button"
            onClick={() => {
              setSearch("");
              setClient(workspace);
              setAssignee("");
              setStatus("");
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}{" "}
          <button className="btn" onClick={refresh}>
            Tentar novamente
          </button>
        </p>
      )}
      <section
        className="agenda-shell"
        aria-label="Calendário de demandas"
        aria-busy={loading}
      >
        <div className="agenda-toolbar">
          <button className="btn" onClick={() => setPeriod(todayLocal())}>
            Hoje
          </button>
          <div className="agenda-arrows">
            <button
              className="btn"
              aria-label="Período anterior"
              onClick={() => setPeriod(navigateAgenda(day, view, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn"
              aria-label="Próximo período"
              onClick={() => setPeriod(navigateAgenda(day, view, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <h2 aria-live="polite">{agendaTitle(day, view, monday)}</h2>
          <DateField
            label="Ir para uma data"
            value={day}
            onChange={(v) => {
              if (v) setPeriod(v);
            }}
          />
          <div
            className="crm-switch"
            role="group"
            aria-label="Visualização do calendário"
          >
            {Object.entries(views).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={view === key}
                className={view === key ? "selected" : ""}
                onClick={() => changeView(key as AgendaView)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="btn agenda-settings"
            aria-label="Opções da agenda"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={17} />
          </button>
          <button
            className="btn primary"
            disabled={editor.busy || saving || !spaces.length}
            onClick={() => editor.createAt(day, client)}
          >
            <Plus size={17} /> Nova demanda
          </button>
        </div>
        {settings && (
          <div className="agenda-options">
            <label>
              <input
                type="checkbox"
                checked={weekends}
                onChange={(e) => setWeekends(e.target.checked)}
              />{" "}
              Mostrar fins de semana
            </label>
            <label>
              <input
                type="checkbox"
                checked={monday}
                onChange={(e) => {
                  setLoading(true);
                  setMonday(e.target.checked);
                }}
              />{" "}
              Semana começa na segunda
            </label>
            <label>
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => {
                  setLoading(true);
                  setHideDone(e.target.checked);
                }}
              />{" "}
              Ocultar concluídas
            </label>
            <button
              className="flow-text-button"
              onClick={() => setSettings(false)}
            >
              Fechar opções
            </button>
          </div>
        )}
        <div className="agenda-caption">
          <span role="status">
            {loading
              ? "Atualizando agenda…"
              : `${shown.length} ${shown.length === 1 ? "demanda" : "demandas"} no período`}
            {!loading && hiddenWeekend > 0
              ? ` · ${hiddenWeekend} somente no fim de semana oculto`
              : ""}
          </span>
          <span>Dia inteiro · datas de início e vencimento</span>
        </div>
        {data?.limited && (
          <p role="alert" className="notice">
            Este período tem {data.total} demandas. Exibindo {items.length};
            filtre por cliente ou responsável para ver um calendário completo.
          </p>
        )}
        {view === "agenda" ? (
          <div className="agenda-list">
            {visibleDays
              .filter((d) => onDay(d).length)
              .map((d) => (
                <section key={d}>
                  <h3>
                    <button
                      onClick={() => {
                        setDay(d);
                        changeView("day");
                      }}
                    >
                      {dayLabel(d, {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                      })}
                    </button>
                    <span>{d === todayLocal() ? "Hoje" : ""}</span>
                  </h3>
                  <div>{onDay(d).map((t) => chip(t, d, false))}</div>
                </section>
              ))}
            {!loading && !shown.length && (
              <div className="agenda-empty">
                <CalendarDays size={32} />
                <h3>Nenhuma demanda neste período.</h3>
                <p>Altere os filtros ou crie uma demanda com vencimento.</p>
                <button
                  className="btn"
                  onClick={() => editor.createAt(day, client)}
                >
                  Criar demanda
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="agenda-grid-scroll"
            tabIndex={0}
            aria-label="Grade de datas; use a rolagem horizontal em telas menores"
          >
            <div
              className={`agenda-grid view-${view}`}
              style={
                {
                  "--agenda-columns": view === "day" ? 1 : weekends ? 7 : 5,
                } as React.CSSProperties
              }
            >
              {(view === "month"
                ? visibleDays.slice(0, weekends ? 7 : 5)
                : visibleDays
              ).map((d) => (
                <div className="agenda-weekday" key={d}>
                  {dayLabel(d, { weekday: "short" })}
                  {view !== "month" && (
                    <b>{dayLabel(d, { day: "numeric", month: "short" })}</b>
                  )}
                </div>
              ))}
              {visibleDays.map((d) => {
                const tasks = onDay(d),
                  compact = view === "month";
                const limit = compact ? 3 : view === "week" ? 20 : Infinity;
                return (
                  <section
                    key={d}
                    aria-label={dayLabel(d)}
                    className={`agenda-cell${d.slice(0, 7) !== day.slice(0, 7) && view === "month" ? " outside" : ""}${d === todayLocal() ? " today" : ""}${dropDay === d ? " drop-target" : ""}`}
                    onDragOver={(e) => {
                      if (drag.current && !disabled) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDropDay(d);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node))
                        setDropDay(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      drop(d);
                    }}
                  >
                    <div className="agenda-cell-heading">
                      <button
                        aria-label={`Ver ${dayLabel(d)}`}
                        aria-current={d === todayLocal() ? "date" : undefined}
                        onClick={() => {
                          setDay(d);
                          changeView("day");
                        }}
                      >
                        {Number(d.slice(-2))}
                      </button>
                      <button
                        className="agenda-add-day"
                        disabled={editor.busy || saving || !spaces.length}
                        aria-label={`Criar demanda em ${dayLabel(d)}`}
                        onClick={() => editor.createAt(d, client)}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    {tasks
                      .slice(0, limit)
                      .map((t) => chip(t, d, view !== "day"))}
                    {tasks.length > limit && (
                      <button
                        className="agenda-more"
                        onClick={() => {
                          setDay(d);
                          changeView("day");
                        }}
                      >
                        + {tasks.length - limit} demandas · ver todas
                      </button>
                    )}
                    {!compact && !tasks.length && (
                      <p className="agenda-no-events">Sem demandas</p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}
        <footer className="agenda-footer">
          <div className="agenda-legend">
            {Object.entries(taskStatuses).map(([key, label]) => (
              <span className={`status-${key}`} key={key}>
                <i className="agenda-status-dot" />
                {label}
              </span>
            ))}
            <span className="overdue">
              <i className="agenda-status-dot" />
              Em atraso
            </span>
          </div>
          <p>
            Arraste uma demanda para mover suas datas. Arraste a borda para
            ajustar o vencimento, ou use “Alterar datas”.
          </p>
          <p>Demandas sem vencimento continuam na área de Demandas.</p>
        </footer>
      </section>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="agenda-google-strip">
        <div>
          <CalendarDays size={20} />
          <span>
            <strong>Google Agenda</strong>
            <small>
              A conexão existente continua disponível para suas demandas.
            </small>
          </span>
        </div>
        <button
          className="btn"
          aria-expanded={google}
          onClick={() => setGoogle(!google)}
        >
          {google ? "Fechar conexão" : "Gerenciar conexão"}
        </button>
      </div>
      {google && <GoogleConnection api={api} />}
      {draft && (
        <Modal
          title="Reagendar demanda"
          close={() => {
            if (!saving) setDraft(null);
          }}
          busy={saving}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveDates();
            }}
          >
            <h3>{draft.task.title}</h3>
            <p className="muted">
              {draft.task.client} · As datas serão atualizadas na própria
              demanda. Descrição, responsável, anexos e subtarefas não mudam.
            </p>
            <div className="agenda-date-fields">
              <DateField
                label="Data inicial"
                value={draft.start_date}
                disabled={saving}
                onChange={(v) => setDraft({ ...draft, start_date: v })}
              />
              <DateField
                label="Vencimento"
                value={draft.due_date}
                disabled={saving}
                onChange={(v) => setDraft({ ...draft, due_date: v || "" })}
              />
            </div>
            <p className="muted">
              Subtarefas mantêm seus próprios prazos. A conexão Google, quando
              ativa, usa o novo vencimento na próxima sincronização.
            </p>
            {saveError && (
              <p className="notice error" role="alert">
                {saveError}
              </p>
            )}
            <div className="crm-actions">
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={() => setDraft(null)}
              >
                Cancelar
              </button>
              <button className="btn primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar datas"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {editor.dialog}
    </section>
  );
}
