import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Camera,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Api, Avatar, Control, Modal, Person } from "./Crm";
import { TaskDialog } from "./Tasks";
import { FlowTaskTable } from "./FlowTaskTable";
import { ChoiceField } from "./TaskControls";
import { blankTask, dueLabel, todayLocal } from "./task-model";
import { ClientDialog, contractState, FlowProjects } from "./Flow";

type Space = { id: number; name: string };
type Props = {
  api: Api;
  actor: string;
  spaces: Space[];
  workspace?: number;
  project?: number;
};
type Navigate = (view: string, workspace?: number, project?: number) => void;
export const dayKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
export function monthDays(month: string) {
  const first = new Date(month + "-01T12:00:00");
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });
}
const stageNames: Record<string, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  review: "Aguardando aprovação",
  done: "Concluído",
};
export function Deadline({ item }: { item: any }) {
  const today = todayLocal(),
    days = item.due_date
      ? Math.round(
          (new Date(item.due_date + "T12:00:00").getTime() -
            new Date(today + "T12:00:00").getTime()) /
            86400000,
        )
      : null;
  const active = item.status !== "done";
  return (
    <small
      className={
        active && days !== null && days < 0
          ? "flow-red"
          : active && days !== null && days <= 3
            ? "flow-amber"
            : ""
      }
    >
      {active && days !== null
        ? days < 0
          ? "Em atraso · "
          : days === 0
            ? "Vence hoje · "
            : days === 1
              ? "Vence amanhã · "
              : days <= 3
                ? `Vence em ${days} dias · `
                : ""
        : ""}
      {item.due_date ? dueLabel(item.due_date) : "Sem prazo"}
    </small>
  );
}
export function ClientCover({
  client,
  small = false,
  onEdit,
}: {
  client: any;
  small?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div
      className={"flow-cover-art" + (small ? " small" : "")}
      style={{
        background: client.details.cover
          ? undefined
          : `linear-gradient(110deg, ${client.details.color || "#55789b"}, #17181b)`,
      }}
    >
      {client.details.cover && (
        <img src={client.details.cover} alt="" referrerPolicy="no-referrer" />
      )}
      <span>/ BĀDON + CLIENTE /</span>
      {onEdit && (
        <button
          type="button"
          className="flow-media-edit flow-cover-edit"
          onClick={onEdit}
        >
          <Camera size={16} /> Alterar capa
        </button>
      )}
    </div>
  );
}
export function ClientMark({
  client,
  onEdit,
}: {
  client: any;
  onEdit?: () => void;
}) {
  return (
    <span
      className="flow-client-mark"
      style={{ background: client.details.color || "#55789b" }}
    >
      {client.details.photo ? (
        <img src={client.details.photo} alt="" referrerPolicy="no-referrer" />
      ) : (
        client.name
          .split(/\s+/)
          .slice(0, 2)
          .map((s: string) => s[0])
          .join("")
          .toUpperCase()
      )}
      {onEdit && (
        <button
          type="button"
          className="flow-media-edit flow-photo-edit"
          onClick={onEdit}
          aria-label="Alterar foto do cliente"
        >
          <Camera size={20} />
          <span>Alterar foto</span>
        </button>
      )}
    </span>
  );
}
function useDeliveryDialog(
  { api, actor, spaces, workspace, project = 0 }: Props,
  changed: () => void,
) {
  const [selected, setSelected] = useState<any>(null),
    [people, setPeople] = useState<Person[]>([]),
    [target, setTarget] = useState(workspace || Number(spaces[0]?.id) || 0),
    [choosing, setChoosing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function open(item: any) {
    setBusy(true);
    setError("");
    try {
      const w = Number(item.workspace_id || workspace || target);
      const [data, list] = await Promise.all([
        item.id
          ? api("task-item", undefined, { workspace: w, id: item.id })
          : Promise.resolve({
              item: {
                ...blankTask(actor),
                project_id: project || null,
                ...item,
              },
              events: [],
              dates_ready: true,
              extensions_ready: true,
            }),
        api("task-list", undefined, {
          workspace: w,
          today: todayLocal(),
          page: 1,
        }),
      ]);
      setPeople(list.people);
      setTarget(w);
      setSelected(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function create() {
    if (workspace) void open({ workspace_id: workspace });
    else setChoosing(true);
  }
  const dialog = (
    <>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {choosing && (
        <Modal
          title="Nova demanda"
          close={() => setChoosing(false)}
          busy={busy}
        >
          <p>Escolha o cliente ou espaço ao qual esta demanda pertence.</p>
          <Control label="Cliente / espaço">
            <select
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            >
              <option value={0}>Selecione</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Control>
          <button
            className="btn primary"
            disabled={!target || busy}
            onClick={() => {
              setChoosing(false);
              void open({ workspace_id: target });
            }}
          >
            Continuar <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {selected && (
        <TaskDialog
          key={selected.item.id + "-" + target}
          initial={selected}
          people={people}
          actor={actor}
          workspace={target}
          api={api}
          editable
          close={() => {
            setSelected(null);
            changed();
          }}
          saved={() => {
            setSelected(null);
            changed();
          }}
          openChild={setSelected}
        />
      )}
    </>
  );
  return { open, create, dialog, busy };
}
export function FlowHome(props: Props & { navigate: Navigate }) {
  const { api, actor, navigate } = props;
  const [data, setData] = useState<any>(null),
    [clients, setClients] = useState<any[]>([]),
    [filter, setFilter] = useState("mine"),
    [revision, setRevision] = useState(0),
    [error, setError] = useState("");
  const editor = useDeliveryDialog(props, () => setRevision((v) => v + 1));
  useEffect(() => {
    let alive = true;
    Promise.all([
      api("flow-overview", undefined, { today: todayLocal() }),
      api("flow-clients"),
    ])
      .then(([d, c]) => {
        if (alive) {
          setData(d);
          setClients(c.items);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  if (error)
    return (
      <p role="alert" className="notice error">
        {error}
      </p>
    );
  if (!data) return <p role="status">Carregando sua visão geral…</p>;
  const tasks: any[] = data.tasks,
    late = tasks.filter((t) => t.due_date && t.due_date < data.today),
    near = tasks.filter(
      (t) => t.due_date >= data.today && t.due_date <= data.attention_end,
    ),
    review = tasks.filter((t) => t.status === "review");
  const mine = tasks.filter((t) => t.assignee === actor);
  const shown =
    filter === "mine"
      ? mine
      : filter === "late"
        ? late
        : filter === "near"
          ? near
          : filter === "review"
            ? review
            : tasks;
  const groups = new Set(
    late.map((t) => t.workspace_id + ":" + (t.project_id || "unassigned")),
  ).size;
  return (
    <section className="flow-page">
      <div className="flow-heading">
        <div>
          <p className="eyebrow">/ ESPAÇO DE TRABALHO /</p>
          <h1>Bom trabalho começa com clareza.</h1>
          <p className="muted">
            Seu time, seus clientes e as próximas entregas. Tudo conectado.
          </p>
        </div>
        <button className="btn primary" onClick={editor.create}>
          <Plus size={18} /> Nova demanda
        </button>
      </div>
      <div className="flow-hero">
        <div>
          <p className="eyebrow">/ VAMOS FAZER ACONTECER /</p>
          <h2>
            {review.length}{" "}
            {review.length === 1 ? "entrega esperando" : "entregas esperando"}
            <br />o próximo passo.
          </h2>
          <p>Acompanhe as aprovações e mantenha a criação em movimento.</p>
        </div>
        <button className="btn" onClick={() => navigate("approvals")}>
          Ver aprovações <ArrowRight size={17} />
        </button>
        <div className="flow-hero-total">
          <strong>{String(tasks.length).padStart(2, "0")}</strong>
          <small>demandas em aberto</small>
        </div>
      </div>
      <div className="flow-stats">
        <button onClick={() => navigate("clients")}>
          <span>
            Clientes no workspace <Users size={18} />
          </span>
          <strong>{data.clients}</strong>
          <small>Cada cliente, um espaço próprio</small>
        </button>
        <button onClick={() => setFilter("all")}>
          <span>
            Em andamento <CalendarDays size={18} />
          </span>
          <strong>{tasks.length}</strong>
          <small>Demandas abertas da equipe</small>
        </button>
        <button className="blue" onClick={() => setFilter("review")}>
          <span>
            Aguardando aprovação <Check size={18} />
          </span>
          <strong>{review.length}</strong>
          <small>Prontas para o próximo passo</small>
        </button>
        <button className="amber" onClick={() => setFilter("near")}>
          <span>
            Prazos próximos <Clock size={18} />
          </span>
          <strong>{near.length}</strong>
          <small>Vencem hoje ou nos próximos 3 dias</small>
        </button>
      </div>
      {!!late.length && (
        <button className="flow-alert red" onClick={() => setFilter("late")}>
          <Clock />
          <span>
            <strong>
              {groups}{" "}
              {groups === 1
                ? "projeto com entregas em atraso"
                : "projetos com entregas em atraso"}
            </strong>
            <small>
              {late.length} entrega(s) com prazo vencido. Revise as pendências e
              defina o próximo passo.
            </small>
          </span>
          Revisar atrasos <ArrowRight size={18} />
        </button>
      )}
      <div className="flow-home-columns">
        <section className="flow-panel">
          <div className="flow-heading">
            <h2>
              {filter === "mine"
                ? "Meu dia · minhas demandas"
                : filter === "late"
                  ? "Entregas em atraso"
                  : filter === "near"
                    ? "Prazos próximos"
                    : filter === "review"
                      ? "Aguardando aprovação"
                      : "Próximas entregas"}
            </h2>
            <button
              className="flow-text-button"
              onClick={() => navigate("tasks")}
            >
              Ver demandas <ArrowRight size={16} />
            </button>
          </div>
          <div className="flow-tabs">
            <button
              className={filter === "mine" ? "selected" : ""}
              onClick={() => setFilter("mine")}
            >
              Atribuídas a mim ({mine.length})
            </button>
            <button
              className={filter === "all" ? "selected" : ""}
              onClick={() => setFilter("all")}
            >
              Toda a equipe
            </button>
          </div>
          {shown.slice(0, 20).map((t) => (
            <button
              key={t.id}
              className="flow-row"
              disabled={editor.busy}
              onClick={() => void editor.open(t)}
            >
              <span>
                <strong>{t.title}</strong>
                <small>
                  {t.client}
                  {t.project_name ? " · " + t.project_name : ""}
                </small>
              </span>
              <Deadline item={t} />
              <ArrowRight size={16} />
            </button>
          ))}
          {!shown.length && (
            <p className="flow-empty">Nenhuma pendência neste grupo.</p>
          )}
          {shown.length > 20 && (
            <p className="muted">
              Mostrando as primeiras 20. Veja todas em Demandas.
            </p>
          )}
        </section>
        <section className="flow-panel">
          <div className="flow-heading">
            <h2>Clientes em movimento</h2>
            <button
              className="flow-text-button"
              onClick={() => navigate("clients")}
            >
              Ver todos <ArrowRight size={16} />
            </button>
          </div>
          {clients
            .filter((c) => Number(c.counts?.demands) > 0)
            .slice(0, 6)
            .map((c) => (
              <button
                className="flow-row"
                key={c.workspace_id}
                onClick={() => navigate("client", Number(c.workspace_id))}
              >
                <ClientMark client={c} />
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.counts.demands} entregas em aberto</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          {!clients.some((c) => Number(c.counts?.demands) > 0) && (
            <p className="flow-empty">
              Os clientes com demandas abertas aparecem aqui.
            </p>
          )}
          <hr />
          <button className="flow-text-button" onClick={() => navigate("crm")}>
            CRM <ArrowRight size={16} />
          </button>
        </section>
      </div>
      {editor.dialog}
    </section>
  );
}
export function FlowWork(
  props: Props & {
    mode?: "board" | "calendar" | "review";
    project?: number;
    embedded?: boolean;
  },
) {
  const {
    api,
    spaces,
    workspace = 0,
    mode = "board",
    project = 0,
    embedded = false,
  } = props;
  const [data, setData] = useState<any>(null),
    [search, setSearch] = useState(""),
    [client, setClient] = useState(workspace),
    [assignee, setAssignee] = useState(""),
    [view, setView] = useState("board"),
    [month, setMonth] = useState(todayLocal().slice(0, 7)),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [owners, setOwners] = useState<Person[]>([]);
  const editor = useDeliveryDialog(props, () => setRevision((v) => v + 1));
  const days = monthDays(month);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api("flow-work", undefined, {
        workspace: client,
        project,
        search,
        assignee,
        status: mode === "review" ? "review" : "",
        from: mode === "calendar" ? days[0] : "",
        to: mode === "calendar" ? days[41] : "",
        page,
      })
        .then((r) => {
          if (alive) {
            setData(r);
            setOwners(r.people || []);
            setError("");
          }
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 150);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [client, project, search, assignee, mode, month, page, revision]);
  const items: any[] = data?.items || [];
  const adjustMonth = (delta: number) => {
    const d = new Date(month + "-01T12:00:00");
    d.setMonth(d.getMonth() + delta);
    setMonth(dayKey(d).slice(0, 7));
    setPage(1);
  };
  const card = (t: any) => (
    <button
      className="flow-delivery-card"
      key={t.id}
      disabled={editor.busy || loading}
      onClick={() => void editor.open(t)}
    >
      {t.extras?.cover && (
        <img
          className="flow-delivery-cover"
          src={t.extras.cover}
          alt=""
          referrerPolicy="no-referrer"
        />
      )}
      <div className="flow-delivery-body">
        <small className="muted">● {t.client}</small>
        <h3>{t.title}</h3>
        <p className="muted">{t.project_name || "Sem projeto"}</p>
        <div className="flow-tags">
          {t.extras?.tags?.map((tag: string) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="flow-tags">
          <span className={"stage-" + t.status}>{stageNames[t.status]}</span>
          {t.parent_id && <span>Subtarefa</span>}
        </div>
        <footer>
          <Deadline item={t} />
          <Avatar
            person={{
              name:
                t.assignee_name ||
                owners.find((p) => p.actor === t.assignee)?.name ||
                "",
              email: owners.find((p) => p.actor === t.assignee)?.email || "?",
            }}
          />
        </footer>
      </div>
    </button>
  );
  return (
    <section className="flow-page">
      {!embedded && (
        <div className="flow-heading">
          <div>
            <p className="eyebrow">/ ESPAÇO DE TRABALHO /</p>
            <h1>
              {mode === "calendar"
                ? "Tempo para fazer acontecer."
                : mode === "review"
                  ? "O próximo passo passa por aqui."
                  : "Da ideia à entrega."}
            </h1>
            <p className="muted">
              {mode === "calendar"
                ? "Prazos e entregas em uma agenda compartilhada."
                : mode === "review"
                  ? "Entregas aguardando revisão e aprovação."
                  : "Um fluxo claro para cada demanda."}
            </p>
          </div>
          <button className="btn primary" onClick={editor.create}>
            <Plus size={18} /> Nova demanda
          </button>
        </div>
      )}
      <div className="flow-work-toolbar">
        <label className="crm-search">
          <Search size={16} />
          <input
            aria-label="Buscar demanda ou projeto"
            placeholder="Buscar demanda ou projeto"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {!workspace && (
          <ChoiceField
            label="Filtrar cliente"
            value={String(client)}
            searchable
            options={[
              { value: "0", label: "Todos os clientes" },
              ...spaces.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
            onChange={(v) => {
              setClient(Number(v));
              setAssignee("");
              setPage(1);
            }}
          />
        )}
        <ChoiceField
          label="Filtrar responsável"
          value={assignee}
          searchable
          options={[
            { value: "", label: "Todos os responsáveis" },
            ...owners.map((p) => ({
              value: p.actor,
              label: p.name || p.email,
              person: p,
            })),
          ]}
          onChange={(v) => {
            setAssignee(v);
            setPage(1);
          }}
        />
        {mode !== "calendar" && (
          <div className="crm-switch">
            <button
              className={view === "board" ? "selected" : ""}
              onClick={() => setView("board")}
            >
              Quadro
            </button>
            <button
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              Lista
            </button>
          </div>
        )}
        {embedded && (
          <button className="btn primary" onClick={editor.create}>
            <Plus size={16} /> Nova demanda
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="muted">
          Atualizando demandas…
        </p>
      )}
      {mode === "calendar" ? (
        <div className="flow-calendar-layout">
          <section className="flow-panel flow-calendar">
            <div className="flow-heading">
              <h2>
                {new Date(month + "-01T12:00:00").toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="flow-calendar-nav">
                <button
                  className="btn"
                  aria-label="Mês anterior"
                  onClick={() => adjustMonth(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setMonth(todayLocal().slice(0, 7));
                    setPage(1);
                  }}
                >
                  Hoje
                </button>
                <button
                  className="btn"
                  aria-label="Próximo mês"
                  onClick={() => adjustMonth(1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="flow-calendar-scroll">
              <div className="flow-calendar-grid">
                {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
                  <div className="flow-weekday" key={d}>
                    {d}
                  </div>
                ))}
                {days.map((d) => (
                  <div
                    key={d}
                    className={
                      "flow-calendar-day" +
                      (d.slice(0, 7) !== month ? " outside" : "")
                    }
                  >
                    <span className={d === todayLocal() ? "today" : ""}>
                      {Number(d.slice(-2))}
                    </span>
                    {items
                      .filter((t) => t.due_date === d)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => void editor.open(t)}
                          className={
                            t.status !== "done" && d < todayLocal()
                              ? "late"
                              : ""
                          }
                          title={t.client + " · " + t.title}
                        >
                          {t.title}
                          <small>{t.client}</small>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <aside className="flow-panel flow-calendar-aside">
            <span className="flow-calendar-icon">31</span>
            <h2>
              Sua agenda,
              <br />
              mais próxima.
            </h2>
            <p className="muted">
              Todos os prazos das demandas em um só lugar. Clique em uma entrega
              para abrir seus detalhes.
            </p>
            <span className="badge">Google ainda não conectado</span>
            <hr />
            <h3>Leve para sua agenda</h3>
            <p className="muted">
              Abra a demanda e use a opção de calendário para exportar a
              entrega. A exportação é manual, sem sincronização.
            </p>
          </aside>
        </div>
      ) : view === "list" ? (
        <FlowTaskTable
          items={items}
          people={owners}
          api={api}
          open={(t) => void editor.open(t)}
          changed={() => {
            setLoading(true);
            setRevision((v) => v + 1);
          }}
          disabled={loading || editor.busy}
        />
      ) : (
        <div
          className={
            "flow-delivery-board" + (mode === "review" ? " review-only" : "")
          }
        >
          {(mode === "review" ? ["review"] : ["todo", "doing", "done"]).map(
            (stage) => (
              <section key={stage}>
                <h2>
                  <span>●</span> {stageNames[stage]}{" "}
                  <small>
                    {
                      items.filter((t) =>
                        stage === "doing"
                          ? ["doing", "review"].includes(t.status)
                          : t.status === stage,
                      ).length
                    }
                  </small>
                </h2>
                {items
                  .filter((t) =>
                    stage === "doing"
                      ? ["doing", "review"].includes(t.status)
                      : t.status === stage,
                  )
                  .map(card)}
                <button className="flow-add-delivery" onClick={editor.create}>
                  + Adicionar demanda
                </button>
              </section>
            ),
          )}
        </div>
      )}
      {data?.total > 200 && (
        <div className="crm-pagination">
          <button
            className="btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <small>
            {data.total} demandas · página {page} · até 200 por página
            {mode === "calendar" ? " (a agenda mostra esta página)" : ""}
          </small>
          <button
            className="btn"
            disabled={page * 200 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}
      {editor.dialog}
    </section>
  );
}
export function FlowClientSpace(
  props: Props & {
    navigate: Navigate;
    reload: () => Promise<void>;
    project?: number;
  },
) {
  const { api, workspace, navigate, reload, project = 0 } = props;
  const [client, setClient] = useState<any>(null),
    [tab, setTab] = useState("projects"),
    [editing, setEditing] = useState(false),
    [editingMedia, setEditingMedia] = useState<"photo" | "cover" | undefined>(),
    [revision, setRevision] = useState(0),
    [error, setError] = useState("");
  const editor = useDeliveryDialog(props, () => setRevision((v) => v + 1));
  useEffect(() => {
    let alive = true;
    api("flow-clients")
      .then((r) => {
        if (alive) {
          const c = r.items.find(
            (c: any) => Number(c.workspace_id) === workspace,
          );
          setClient(c);
          if (!c)
            setError(
              "Cliente não encontrado. Abra Clientes para vincular o espaço existente.",
            );
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [workspace, revision]);
  useEffect(() => {
    if (project) setTab("tasks");
  }, [project]);
  if (error)
    return (
      <p role="alert" className="notice error">
        {error}
      </p>
    );
  if (!client) return <p role="status">Carregando espaço do cliente…</p>;
  const c = client,
    d = c.details,
    resourceCategory =
      tab === "brand"
        ? "brand"
        : tab === "briefing"
          ? "briefing"
          : tab === "contract"
            ? "contract"
            : "documents";
  return (
    <section className="flow-page">
      <button className="flow-text-button" onClick={() => navigate("clients")}>
        <ArrowLeft size={17} /> Voltar
      </button>
      <div className="flow-client-profile">
        <ClientCover
          client={c}
          onEdit={() => {
            setEditingMedia("cover");
            setEditing(true);
          }}
        />
        <div className="flow-client-profile-main">
          <ClientMark
            client={c}
            onEdit={() => {
              setEditingMedia("photo");
              setEditing(true);
            }}
          />
          <div>
            <p className="eyebrow">/ ESPAÇO DO CLIENTE /</p>
            <h1>{c.name}</h1>
            <p className="muted">{d.segment || c.contact}</p>
            <div className="flow-tags">
              <span className={c.active ? "stage-done" : ""}>
                {c.active ? "Cliente ativo" : "Cliente inativo"}
              </span>
              <span>{contractState(d)}</span>
            </div>
          </div>
          <button
            className="btn"
            onClick={() => {
              setEditingMedia(undefined);
              setEditing(true);
            }}
          >
            Editar perfil
          </button>
          <button className="btn primary" onClick={editor.create}>
            <Plus size={16} /> Nova demanda
          </button>
        </div>
      </div>
      <div className="flow-tabs flow-client-tabs">
        {[
          ["projects", "Projetos"],
          ["tasks", "Demandas"],
          ["review", "Aprovações"],
          ["calendar", "Agenda"],
          ["general", "Informações"],
          ["briefing", "Briefing"],
          ["brand", "Identidade visual"],
          ["documents", "Documentos"],
          ["contract", "Contrato"],
        ].map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "selected" : ""}
            onClick={() => {
              setTab(k);
              if (project) navigate("client", workspace);
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {tab === "projects" && (
        <FlowProjects
          api={api}
          workspace={workspace!}
          navigate={(_, w, p) => {
            setTab("tasks");
            navigate("client", w, p);
          }}
        />
      )}
      {["tasks", "review", "calendar"].includes(tab) && (
        <>
          {project > 0 && (
            <p className="notice">
              Projeto BD-{String(project).padStart(4, "0")}{" "}
              <button
                className="flow-text-button"
                onClick={() => navigate("client", workspace)}
              >
                Ver todas as demandas
              </button>
            </p>
          )}
          <FlowWork
            key={tab + ":" + project + ":" + revision}
            {...props}
            mode={
              tab === "calendar"
                ? "calendar"
                : tab === "review"
                  ? "review"
                  : "board"
            }
            project={project}
            embedded
          />
        </>
      )}
      {!["projects", "tasks", "review", "calendar"].includes(tab) && (
        <section className="flow-panel">
          <div className="flow-heading">
            <h2>
              {
                {
                  general: "Informações do cliente",
                  briefing: "Briefing",
                  brand: "Identidade visual",
                  documents: "Documentos",
                  contract: "Contrato",
                }[tab]
              }
            </h2>
            <button className="btn" onClick={() => setEditing(true)}>
              Editar informações
            </button>
          </div>
          {tab === "general" && (
            <>
              <p className="flow-preserve">
                {d.description ||
                  "Adicione uma descrição no perfil do cliente."}
              </p>
              <dl className="flow-info-grid">
                {[
                  ["Contato", c.contact],
                  ["E-mail", c.email],
                  ["Telefone", c.phone],
                  ["Documento", c.document],
                  ["Responsável", d.owner],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v || "Não informado"}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {(tab === "briefing" || tab === "brand") && (
            <p className="flow-preserve">
              {d[tab] || "Nenhuma informação cadastrada ainda."}
            </p>
          )}
          {tab === "contract" && (
            <>
              <p
                className={
                  contractState(d) === "Vencido"
                    ? "flow-red"
                    : contractState(d) === "A vencer"
                      ? "flow-amber"
                      : ""
                }
              >
                Situação: {contractState(d)}
              </p>
              <p>
                Início: {dueLabel(d.contract_start)} · Término:{" "}
                {dueLabel(d.contract_end)}
              </p>
              <p className="flow-preserve">{d.contract_notes}</p>
              {d.contract_url && (
                <a href={d.contract_url} target="_blank" rel="noreferrer">
                  Abrir contrato ↗
                </a>
              )}
            </>
          )}
          {tab !== "general" && (
            <div className="flow-resource-list">
              {(d.resources || [])
                .filter((r: any) => r.category === resourceCategory)
                .map((r: any, i: number) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer">
                    {r.name} <ArrowRight size={16} />
                  </a>
                ))}
              {!(d.resources || []).some(
                (r: any) => r.category === resourceCategory,
              ) && <p className="muted">Nenhum arquivo ou link nesta seção.</p>}
            </div>
          )}
        </section>
      )}
      {editor.dialog}
      {editing && (
        <ClientDialog
          initial={c}
          initialMedia={editingMedia}
          initialTab={
            editingMedia
              ? "general"
              : tab === "documents"
                ? "resources"
                : ["briefing", "brand", "contract"].includes(tab)
                  ? tab
                  : "general"
          }
          spaces={[]}
          api={api}
          navigate={navigate}
          close={() => setEditing(false)}
          saved={async () => {
            setEditing(false);
            setRevision((v) => v + 1);
            await reload();
          }}
        />
      )}
    </section>
  );
}
