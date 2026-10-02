import React, { useEffect, useState } from "react";
import {
  Plus,
  Check,
  ListChecks,
  LockKeyhole,
  Users,
  CalendarDays,
  Search,
  LayoutGrid,
  List,
  Archive,
  ArrowUpRight,
} from "lucide-react";
import {
  Api,
  Avatar,
  Control,
  Modal,
  OpportunityDialog,
  Person,
  isoDate,
} from "./Crm";
import "./tasks.css";
import { TaskList, QuickTask } from "./TaskList";
import {
  taskStatuses,
  taskPriorities,
  TaskItem,
  TaskGrouping,
  todayLocal,
  dayBounds,
  blankTask,
  dueLabel,
} from "./task-model";
export {
  taskStatuses,
  taskPriorities,
  todayLocal,
  dayBounds,
  blankTask,
} from "./task-model";
const timeLabel = (date: string) =>
  new Date(isoDate(date)!).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
export function TaskCard({
  item,
  people,
  today,
  editable,
  busy,
  open,
  toggle,
  openOpportunity,
}: {
  item: TaskItem;
  people: Person[];
  today: string;
  editable: boolean;
  busy: boolean;
  open: () => void;
  toggle: () => void;
  openOpportunity: () => void;
}) {
  const person = people.find((p) => p.actor === item.assignee);
  const overdue =
    item.status !== "done" && !!item.due_date && item.due_date < today;
  return (
    <article className={"task-card task-" + item.status}>
      <div className="task-card-top">
        <button
          className={"task-check " + (item.status === "done" ? "checked" : "")}
          aria-label={
            item.status === "done"
              ? "Reabrir tarefa: " + item.title
              : "Concluir tarefa: " + item.title
          }
          disabled={!editable || busy || !!item.archived}
          onClick={toggle}
        >
          {item.status === "done" && <Check size={15} />}
        </button>
        <button className="task-title" disabled={busy} onClick={open}>
          {item.title}
        </button>
        {item.visibility === "private" && (
          <span title="Particular" aria-label="Tarefa particular">
            <LockKeyhole size={14} />
          </span>
        )}
      </div>
      <div className="task-tags">
        <span className={"task-priority priority-" + item.priority}>
          {taskPriorities[item.priority]}
        </span>
        <span>{taskStatuses[item.status]}</span>
      </div>
      {item.opportunity_id && (
        <button className="task-link" disabled={busy} onClick={openOpportunity}>
          <ArrowUpRight size={13} />
          {item.opportunity_name || "Oportunidade vinculada"}
        </button>
      )}
      <div className="task-card-bottom">
        <span className={overdue ? "task-late" : ""}>
          <CalendarDays size={13} />
          {overdue ? "Atrasada · " : ""}
          {dueLabel(item.due_date)}
        </span>
        {!!item.checklist.length && (
          <span title="Checklist">
            <ListChecks size={13} />
            {item.checklist.filter((c) => c.done).length}/
            {item.checklist.length}
          </span>
        )}
      </div>
      <div className="task-owner">
        {person ? (
          <>
            <Avatar person={person} />
            <span>{person.name || person.email}</span>
          </>
        ) : (
          <span>Sem responsável</span>
        )}
      </div>
    </article>
  );
}

export function Tasks({
  api,
  workspace,
  actor,
  editable,
  day = false,
}: {
  api: Api;
  workspace: number;
  actor: string;
  editable: boolean;
  day?: boolean;
}) {
  const [today, setToday] = useState(todayLocal);
  const [mode, setMode] = useState("list");
  const [grouping, setGrouping] = useState<TaskGrouping>(
    day ? "date" : "status",
  );
  const [created, setCreated] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [mine, setMine] = useState(day);
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState("");
  const [dayError, setDayError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [crm, setCrm] = useState<any>(null);
  useEffect(() => {
    const timer = setInterval(() => setToday(todayLocal()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api("task-list", undefined, {
        workspace,
        today,
        search,
        status,
        priority,
        mine: mine ? 1 : 0,
        day: day ? 1 : 0,
        archived: archived ? 1 : 0,
        page,
      })
        .then((r) => {
          if (alive) setData(r);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [
    workspace,
    today,
    search,
    status,
    priority,
    mine,
    day,
    archived,
    page,
    refresh,
  ]);
  useEffect(() => {
    if (!day) return;
    let alive = true;
    setDayLoading(true);
    setDayError("");
    api("task-day", undefined, { workspace, ...dayBounds(today) })
      .then((r) => {
        if (alive) setDaily(r);
      })
      .catch((e) => {
        if (alive) setDayError(e.message);
      })
      .finally(() => {
        if (alive) setDayLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [workspace, today, day, refresh]);
  const people: Person[] = data?.people || [];
  const items: TaskItem[] = data?.items || [];
  const reload = () => {
    setSelected(null);
    setCrm(null);
    setRefresh((n) => n + 1);
  };
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const open = (id: number) =>
    void run(async () =>
      setSelected(await api("task-item", undefined, { workspace, id })),
    );
  const openCrm = (id: number) =>
    void run(async () =>
      setCrm(await api("crm-item", undefined, { workspace, id })),
    );
  const filter = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const addTask = (status = "todo", due: string | null = null) =>
    setSelected({
      item: { ...blankTask(actor), status, due_date: due },
      events: [],
      dates_ready: !!data?.dates_ready,
    });
  const updateTask = (item: TaskItem, changes: Partial<TaskItem>) =>
    void run(async () => {
      await api("task-update", { ...item, workspace, ...changes });
      setRefresh((n) => n + 1);
    });
  const card = (item: TaskItem) => (
    <TaskCard
      key={item.id}
      item={item}
      people={people}
      today={today}
      editable={editable}
      busy={busy || loading}
      open={() => open(item.id)}
      openOpportunity={() => openCrm(Number(item.opportunity_id))}
      toggle={() =>
        updateTask(item, { status: item.status === "done" ? "todo" : "done" })
      }
    />
  );
  return (
    <section className="tasks-page">
      <div className="crm-heading">
        <div>
          <p className="eyebrow">ROTINA · SEU ESPAÇO</p>
          <h1>{day ? "Meu dia" : "Tarefas"}</h1>
          <p className="muted">
            {day
              ? "Suas prioridades, reuniões e próximas conversas, neste espaço."
              : "Uma entrega de cada vez. Organize o trabalho com sua equipe."}
          </p>
        </div>
        {editable && (
          <button
            className="btn primary"
            disabled={busy || loading || !data}
            onClick={() => addTask()}
          >
            <Plus size={16} /> Nova tarefa
          </button>
        )}
      </div>
      {day && (
        <p className="task-day-date">
          {new Date(today + "T12:00:00").toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · horário e dia deste dispositivo
        </p>
      )}
      {editable && !archived && (
        <QuickTask
          api={api}
          workspace={workspace}
          actor={actor}
          day={day}
          disabled={busy || loading || !data || !!error}
          created={(id) => {
            setCreated(id);
            setPage(1);
            setRefresh((n) => n + 1);
          }}
        />
      )}
      {created && (
        <p className="task-created" role="status">
          Tarefa adicionada.{" "}
          <button
            className="task-link"
            disabled={busy || loading}
            onClick={() => open(created)}
          >
            Abrir detalhes
          </button>
          <small>
            Ela pode ficar fora dos filtros atuais. Tarefas futuras aparecem em
            Tarefas.
          </small>
        </p>
      )}
      {data && !data.dates_ready && (
        <p className="notice">
          Para habilitar a data inicial, execute <code>tasks:migrate</code> no
          Terminal do cPanel. As tarefas existentes continuam disponíveis.
        </p>
      )}
      <div className="task-metrics">
        {[
          [day ? "Para organizar" : "Tarefas", data?.metrics.total],
          [
            day ? "Vencem hoje" : "Concluídas",
            day ? data?.metrics.today : data?.metrics.done,
          ],
          ["Atrasadas", data?.metrics.overdue],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value || 0}</strong>
          </div>
        ))}
      </div>
      <div className="task-toolbar">
        <label className="crm-search">
          <Search size={16} />
          <input
            aria-label="Buscar tarefas"
            placeholder="Buscar tarefas…"
            maxLength={200}
            value={search}
            onChange={(e) => filter(() => setSearch(e.target.value))}
          />
        </label>
        {!day && (
          <>
            <select
              aria-label="Etapa das tarefas"
              value={status}
              onChange={(e) => filter(() => setStatus(e.target.value))}
            >
              <option value="">Todas as etapas</option>
              {Object.entries(taskStatuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={mine}
                onChange={(e) => filter(() => setMine(e.target.checked))}
              />{" "}
              Minhas tarefas
            </label>
            <label>
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => filter(() => setArchived(e.target.checked))}
              />{" "}
              Arquivadas
            </label>
          </>
        )}
        <select
          aria-label="Prioridade das tarefas"
          value={priority}
          onChange={(e) => filter(() => setPriority(e.target.value))}
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(taskPriorities).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          className="btn"
          disabled={loading || busy}
          onClick={() => setRefresh((n) => n + 1)}
        >
          Atualizar
        </button>
      </div>
      <div className="crm-viewbar">
        <p className="muted" role="status">
          {loading
            ? "Carregando tarefas…"
            : `${data?.metrics.total || 0} tarefas · página ${page}`}
        </p>
        {(mode === "list" || day) && (
          <label className="task-grouping">
            Agrupar por
            <select
              value={grouping}
              onChange={(e) => setGrouping(e.target.value as TaskGrouping)}
            >
              <option value="status">Status</option>
              <option value="date">Vencimento</option>
            </select>
          </label>
        )}
        {!day && (
          <div
            className="crm-switch"
            role="group"
            aria-label="Visualização de tarefas"
          >
            {[
              ["list", "Lista", List],
              ["board", "Quadro", LayoutGrid],
            ].map(([key, label, Icon]: any) => (
              <button
                key={key}
                aria-pressed={mode === key}
                className={mode === key ? "selected" : ""}
                onClick={() => setMode(key)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}{" "}
          <button className="btn" onClick={() => setRefresh((n) => n + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {mode === "board" && !day ? (
        <div className="task-board" aria-busy={loading}>
          {Object.entries(taskStatuses).map(([key, label]) => (
            <section key={key}>
              <h2>
                {label}{" "}
                <small>
                  {items.filter((i) => i.status === key).length} nesta página
                </small>
              </h2>
              {items.filter((i) => i.status === key).map(card)}
              {!loading && !items.some((i) => i.status === key) && (
                <p className="task-empty">Nenhuma tarefa nesta etapa.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <TaskList
          items={items}
          people={people}
          today={today}
          grouping={grouping}
          editable={editable}
          busy={busy || loading || !!error}
          archived={archived}
          statusFilter={status}
          open={(item) => open(item.id)}
          update={updateTask}
          openOpportunity={openCrm}
          add={addTask}
        />
      )}
      {!loading && !error && !items.length && (
        <div className="task-empty">
          <ListChecks size={30} />
          <h2>
            {day
              ? "Seu dia está livre por aqui."
              : "Nenhuma tarefa encontrada."}
          </h2>
          <p>
            {day
              ? "Tarefas futuras ficam em Tarefas. Novas tarefas sem prazo também aparecem aqui."
              : "Crie uma tarefa ou ajuste os filtros."}
          </p>
        </div>
      )}
      <div className="crm-pagination">
        <small>
          {day
            ? "Somente suas pendências até hoje ou sem prazo, sem início futuro. "
            : ""}
          Até 100 por página · métricas dos resultados filtrados.
        </small>
        <button
          className="btn"
          disabled={page === 1 || loading || busy}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <button
          className="btn"
          disabled={
            page * 100 >= Number(data?.metrics.total || 0) || loading || busy
          }
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
      {day && (
        <div className="task-day-panels">
          {dayError && (
            <p className="notice error" role="alert">
              {dayError}{" "}
              <button className="btn" onClick={() => setRefresh((n) => n + 1)}>
                Tentar novamente
              </button>
            </p>
          )}
          <section className="profile-box">
            <h2>Seus agendamentos</h2>
            <p className="muted">
              Até 20 atividades do CRM de hoje ou atrasadas, atribuídas a você.
            </p>
            {dayLoading ? (
              <p>Carregando agenda…</p>
            ) : (
              daily?.appointments.map((o: any) => (
                <button
                  className="task-day-link"
                  key={o.id}
                  disabled={busy}
                  onClick={() => openCrm(o.id)}
                >
                  <span>
                    <strong>{o.name}</strong>
                    <small>{o.next_action}</small>
                  </span>
                  <span>
                    {timeLabel(o.scheduled_at)} <ArrowUpRight size={14} />
                  </span>
                </button>
              ))
            )}
            {!dayLoading && !dayError && !daily?.appointments.length && (
              <p>Nenhum agendamento pendente até hoje.</p>
            )}
          </section>
          <section className="profile-box">
            <h2>Retomar uma conversa</h2>
            <p className="muted">
              Até 20 oportunidades suas abertas e sem contato registrado há mais
              de 7 dias.
            </p>
            {dayLoading ? (
              <p>Carregando oportunidades…</p>
            ) : (
              daily?.attention.map((o: any) => (
                <button
                  className="task-day-link"
                  key={o.id}
                  disabled={busy}
                  onClick={() => openCrm(o.id)}
                >
                  <strong>{o.name}</strong>
                  <span>
                    {data?.stages[o.stage]} <ArrowUpRight size={14} />
                  </span>
                </button>
              ))
            )}
            {!dayLoading && !dayError && !daily?.attention.length && (
              <p>
                Nenhuma oportunidade precisando de retomada por esse critério.
              </p>
            )}
          </section>
        </div>
      )}
      <p className="muted task-footnote">
        As tarefas pertencem ao espaço selecionado. Não há envio de lembretes
        nem sincronização com Google Agenda nesta etapa.
      </p>
      {selected && (
        <TaskDialog
          initial={selected}
          people={people}
          actor={actor}
          workspace={workspace}
          api={api}
          editable={editable}
          close={() => setSelected(null)}
          saved={reload}
        />
      )}
      {crm && (
        <OpportunityDialog
          initial={crm}
          api={api}
          workspace={workspace}
          editable={editable}
          people={people}
          stages={data?.stages || {}}
          close={() => setCrm(null)}
          saved={reload}
        />
      )}
    </section>
  );
}

export function TaskDialog({
  initial,
  people,
  actor,
  workspace,
  api,
  editable,
  close,
  saved,
}: {
  initial: any;
  people: Person[];
  actor: string;
  workspace: number;
  api: Api;
  editable: boolean;
  close: () => void;
  saved: () => void;
}) {
  const [item, setItem] = useState<TaskItem>(initial.item);
  const [dirty, setDirty] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [optionsError, setOptionsError] = useState("");
  useEffect(() => {
    if (!editable || item.archived) return;
    let alive = true;
    setOptionsError("");
    const timer = setTimeout(() => {
      api("task-options", undefined, { workspace, search })
        .then((r) => {
          if (alive) setOptions(r.opportunities);
        })
        .catch((e) => {
          if (alive) setOptionsError(e.message);
        });
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [workspace, search, editable, item.archived]);
  const change = (key: keyof TaskItem, value: any) => {
    setItem({ ...item, [key]: value });
    setDirty(true);
  };
  const dismiss = () => {
    if (
      (!dirty && !comment.trim()) ||
      confirm("Descartar alterações não salvas desta tarefa?")
    )
      close();
  };
  async function action(type: string, extra: object = {}) {
    if (
      type !== "task-comment" &&
      comment.trim() &&
      !confirm("Há um comentário não publicado. Continuar e descartá-lo?")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(type, { ...item, workspace, ...extra });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const writable = editable && !item.archived;
  return (
    <Modal
      title={item.id ? "Detalhes da tarefa" : "Nova tarefa"}
      close={dismiss}
      busy={busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action(item.id ? "task-update" : "task-create");
        }}
      >
        <fieldset disabled={!writable || busy} className="task-fields">
          <Control label="Título *">
            <input
              autoFocus
              required
              maxLength={200}
              value={item.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </Control>
          <Control label="Descrição e informações da tarefa">
            <textarea
              rows={6}
              placeholder="Contexto, briefing, links de referência e o que precisa ser entregue…"
              maxLength={10000}
              value={item.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </Control>
          <div className="task-fields-grid">
            <Control label="Status">
              <select
                value={item.status}
                onChange={(e) => change("status", e.target.value)}
              >
                {Object.entries(taskStatuses).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Control>
            <Control label="Prioridade">
              <select
                value={item.priority}
                onChange={(e) => change("priority", e.target.value)}
              >
                {Object.entries(taskPriorities).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Control>
            <Control label="Data inicial">
              <input
                type="date"
                min="2000-01-01"
                max={item.due_date || "2100-12-31"}
                disabled={!initial.dates_ready}
                value={item.start_date || ""}
                onChange={(e) => change("start_date", e.target.value || null)}
              />
            </Control>
            <Control label="Data de vencimento">
              <input
                type="date"
                min={item.start_date || "2000-01-01"}
                max="2100-12-31"
                value={item.due_date || ""}
                onChange={(e) => change("due_date", e.target.value || null)}
              />
            </Control>
            <Control label="Visibilidade">
              <select
                disabled={!!item.id && item.creator !== actor}
                value={item.visibility}
                onChange={(e) => {
                  setItem({
                    ...item,
                    visibility: e.target.value as TaskItem["visibility"],
                    assignee:
                      e.target.value === "private" ? actor : item.assignee,
                  });
                  setDirty(true);
                }}
              >
                <option value="team">Equipe deste espaço</option>
                <option value="private">Particular — só você</option>
              </select>
            </Control>
            <Control label="Responsável">
              <select
                disabled={item.visibility === "private"}
                value={item.assignee || ""}
                onChange={(e) => change("assignee", e.target.value || null)}
              >
                <option value="">Sem responsável</option>
                {people.map((p) => (
                  <option key={p.actor} value={p.actor}>
                    {p.name || p.email}
                  </option>
                ))}
              </select>
            </Control>
          </div>
          <p className="muted">
            <Users size={14} /> Compartilhada: membros deste espaço podem
            consultar. Particular: apenas quem criou vê no aplicativo. Leitores
            não alteram tarefas.
          </p>
          <Control label="Buscar oportunidade do CRM">
            <input
              placeholder="Nome do contato ou empresa…"
              value={search}
              maxLength={150}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Control>
          <Control label="Vincular oportunidade (opcional)">
            <select
              value={item.opportunity_id || ""}
              onChange={(e) =>
                change(
                  "opportunity_id",
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Sem vínculo</option>
              {item.opportunity_id &&
                !options.some(
                  (o) => Number(o.id) === Number(item.opportunity_id),
                ) && (
                  <option value={item.opportunity_id}>
                    {item.opportunity_name || "Oportunidade vinculada"}
                  </option>
                )}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.company ? " · " + o.company : ""}
                </option>
              ))}
            </select>
          </Control>
          <small>
            Até 30 resultados. Busque pelo nome para encontrar outras
            oportunidades.
          </small>
          {optionsError && (
            <p className="notice error" role="alert">
              {optionsError}
            </p>
          )}
          <h3>
            Checklist{" "}
            <small>
              {item.checklist.filter((c) => c.done).length}/
              {item.checklist.length}
            </small>
          </h3>
          <div className="task-checklist">
            {item.checklist.map((c, i) => (
              <div key={c.id}>
                <input
                  type="checkbox"
                  aria-label={"Concluir item " + (i + 1)}
                  checked={c.done}
                  onChange={(e) =>
                    change(
                      "checklist",
                      item.checklist.map((x) =>
                        x.id === c.id ? { ...x, done: e.target.checked } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={"Texto do item " + (i + 1)}
                  required
                  maxLength={300}
                  value={c.text}
                  onChange={(e) =>
                    change(
                      "checklist",
                      item.checklist.map((x) =>
                        x.id === c.id ? { ...x, text: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn"
                  aria-label={"Remover item " + (i + 1)}
                  onClick={() =>
                    change(
                      "checklist",
                      item.checklist.filter((x) => x.id !== c.id),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn"
            type="button"
            disabled={item.checklist.length >= 50}
            onClick={() =>
              change("checklist", [
                ...item.checklist,
                { id: crypto.randomUUID(), text: "", done: false },
              ])
            }
          >
            <Plus size={15} /> Item do checklist
          </button>
        </fieldset>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={dismiss}
          >
            Fechar
          </button>
          {writable && (
            <button className="btn primary" disabled={busy}>
              {busy ? "Salvando…" : item.id ? "Salvar tarefa" : "Criar tarefa"}
            </button>
          )}
        </div>
      </form>
      {!!item.id && (
        <>
          {editable && (
            <button
              className="btn"
              disabled={busy || dirty}
              onClick={() => {
                if (
                  confirm(
                    item.archived
                      ? "Restaurar esta tarefa?"
                      : "Arquivar esta tarefa? Ela poderá ser restaurada em Arquivadas.",
                  )
                )
                  void action("task-archive", { archived: !item.archived });
              }}
            >
              <Archive size={15} />
              {item.archived ? "Restaurar tarefa" : "Arquivar tarefa"}
            </button>
          )}
          <hr />
          <h3>Comentários e histórico</h3>
          {writable && (
            <form
              className="crm-note"
              onSubmit={(e) => {
                e.preventDefault();
                void action("task-comment", { message: comment });
              }}
            >
              <Control label="Novo comentário">
                <textarea
                  required
                  maxLength={2000}
                  disabled={busy}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Control>
              <button
                className="btn"
                disabled={busy || dirty || !comment.trim()}
              >
                Publicar comentário
              </button>
              {dirty && (
                <small>Salve a tarefa antes de publicar o comentário.</small>
              )}
            </form>
          )}
          <ol className="crm-history">
            {initial.events.map((event: any) => (
              <li key={event.id}>
                <p>{event.message}</p>
                <small>
                  {event.actor_name ||
                    people.find((p) => p.actor === event.actor)?.email ||
                    "Membro da equipe"}{" "}
                  · {timeLabel(event.created_at)}
                </small>
              </li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  );
}
