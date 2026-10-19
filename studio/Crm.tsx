import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  X,
  ArrowRight,
  UserRound,
  Check,
  Phone,
  Inbox,
  Download,
} from "lucide-react";
import type { Profile } from "./types";
import "./crm.css";
import { SalesControl } from "./Flow";
import {
  CrmDirectory,
  CrmSavedViews,
  DirectoryPicker,
  CrmActivities,
} from "./CrmPlus";

export type Api = (
  action: string,
  data?: unknown,
  query?: Record<string, string | number>,
) => Promise<any>;
export type Request = (url: string, init?: RequestInit) => Promise<any>;
export type Person = {
  workspace_ids?: number[];
  actor: string;
  name: string;
  email: string;
  avatar_url: string | null;
};
type Opportunity = {
  id: number;
  revision: number;
  name: string;
  company: string;
  document: string;
  email: string;
  phone: string;
  stage: string;
  assignee: string | null;
  amount: string;
  source: string;
  notes: string;
  next_action: string;
  scheduled_at: string | null;
  last_contact_at: string | null;
  created_at: string;
  lead_id: number | null;
  form_title?: string;
  company_id?: number | null;
  contact_id?: number | null;
  service?: string;
  expected_close?: string | null;
  loss_reason?: string;
  followup_due?: string | null;
  pending_activities?: number;
};
export const stageColors: Record<string, string> = {
  new: "#8b9bb2",
  qualified: "#4388ff",
  scheduled: "#a57af8",
  no_show: "#f49b41",
  negotiation: "#e36bb2",
  follow_up: "#dbbb3d",
  won: "#26b883",
  disqualified: "#e67676",
  fake: "#8292a9",
};
const money = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const isoDate = (value: string | null) =>
  value ? value.replace(" ", "T") + "Z" : null;
const dateLabel = (value: string | null) =>
  value
    ? new Date(isoDate(value)!).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não agendado";
export function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(isoDate(value)!);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export const utcInput = (value: string) =>
  value ? new Date(value).toISOString().replace(".000Z", "Z") : null;
export function Avatar({
  person,
}: {
  person: { name?: string; email?: string; avatar_url?: string | null };
}) {
  return (
    <span className="person-avatar">
      {person.avatar_url ? (
        <img src={person.avatar_url} alt="" />
      ) : (
        (person.name || person.email || "?")
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase()
      )}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
  busy = false,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  busy?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"crm-modal " + className}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={close}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Control({
  label,
  children,
  icon,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"control " + className}>
      <span>
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
const blank = (): Opportunity & { create_key: string } => ({
  id: 0,
  revision: 0,
  name: "",
  company: "",
  document: "",
  email: "",
  phone: "",
  stage: "new",
  assignee: null,
  amount: "0",
  source: "Manual",
  notes: "",
  next_action: "",
  scheduled_at: null,
  last_contact_at: null,
  created_at: "",
  lead_id: null,
  create_key: crypto.randomUUID(),
});

export function Crm({
  api,
  workspace,
  editable,
  agenda = false,
  commercial = false,
}: {
  api: Api;
  workspace: number;
  editable: boolean;
  agenda?: boolean;
  commercial?: boolean;
}) {
  const [mode, setMode] = useState(agenda ? "agenda" : "kanban");
  const [section, setSection] = useState("opportunities");
  const [focus, setFocus] = useState("");
  const [sort, setSort] = useState("newest");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [assignee, setAssignee] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api("crm-list", undefined, {
        workspace,
        search,
        stage,
        assignee,
        focus,
        sort,
        company_id: companyId,
        contact_id: contactId,
        page,
        agenda: mode === "agenda" ? 1 : 0,
        from: from ? utcInput(from + "T00:00:00")! : "",
        to: to ? utcInput(to + "T23:59:59")! : "",
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
    search,
    stage,
    assignee,
    from,
    to,
    page,
    mode,
    refresh,
    focus,
    sort,
    companyId,
    contactId,
  ]);
  const stages: Record<string, string> = data?.stages || {};
  const people: Person[] = data?.people || [];
  const person = (actor: string | null) =>
    people.find((p) => p.actor === actor);
  const items: Opportunity[] = data?.items || [];
  async function open(id: number) {
    setBusy(true);
    setError("");
    try {
      setSelected(await api("crm-item", undefined, { workspace, id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function move(item: Opportunity, nextStage: string) {
    if (!editable || busy || nextStage === item.stage) return;
    setBusy(true);
    setError("");
    try {
      await api("crm-update", {
        ...item,
        workspace,
        stage: nextStage,
        scheduled_at: isoDate(item.scheduled_at),
      });
      setRefresh((x) => x + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setDragging(null);
    }
  }
  const filters = (fn: () => void) => {
    fn();
    setPage(1);
  };
  function exportPage() {
    const cell = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[\s]*[=+@-]/, (m) => "'" + m)
        .replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Nome",
        "Empresa",
        "Email",
        "Telefone",
        "Etapa",
        "Responsável",
        "Valor",
        "Origem",
        "Próxima atividade",
        "Data",
      ],
      ...items.map((i) => [
        i.name,
        i.company,
        i.email,
        i.phone,
        stages[i.stage],
        person(i.assignee)?.name || person(i.assignee)?.email || "",
        i.amount,
        i.source,
        i.next_action,
        dateLabel(i.scheduled_at),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "oportunidades-pagina-" + page + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="crm-page">
      <div className="crm-heading">
        <div>
          <p className="eyebrow">COMERCIAL · SEU ESPAÇO</p>
          <h1>{agenda ? "Agendamentos" : "CRM"}</h1>
          <p className="muted">Da primeira resposta à próxima conversa.</p>
        </div>
        {editable && section === "opportunities" && (
          <button
            className="btn primary"
            disabled={busy || !data}
            onClick={() =>
              setSelected({
                item: blank(),
                events: [],
                answers: [],
                plus_ready: data?.plus_ready,
                activities: [],
              })
            }
          >
            <Plus size={17} /> Nova oportunidade
          </button>
        )}
      </div>
      {data?.plus_ready && (
        <div className="crm-section-tabs" role="group" aria-label="Área do CRM">
          {[
            ["opportunities", "Oportunidades"],
            ["company", "Empresas"],
            ["contact", "Contatos"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={section === key}
              className={section === key ? "selected" : ""}
              onClick={() => setSection(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {section !== "opportunities" ? (
        <CrmDirectory
          key={section}
          api={api}
          workspace={workspace}
          kind={section as "company" | "contact"}
          editable={editable}
          onOpportunities={(kind, r) => {
            setCompanyId(kind === "company" ? String(r.id) : "");
            setContactId(kind === "contact" ? String(r.id) : "");
            setSearch("");
            setStage("");
            setAssignee("");
            setFrom("");
            setTo("");
            setFocus("");
            setMode("list");
            setPage(1);
            setSection("opportunities");
          }}
        />
      ) : (
        <>
          {data?.plus_ready && (
            <>
              <div
                className="crm-quick-filters"
                role="group"
                aria-label="Acompanhamento"
              >
                {[
                  ["", "Todas"],
                  ["open", "Em negociação"],
                  ["mine", "Minhas oportunidades"],
                  ["overdue", "Follow-ups atrasados"],
                  ["untouched", "Sem contato há 7 dias"],
                  ["unscheduled", "Sem próximo passo"],
                ].map(([key, label]) => (
                  <button
                    className={focus === key ? "selected" : ""}
                    aria-pressed={focus === key}
                    key={key}
                    onClick={() => filters(() => setFocus(key))}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <CrmSavedViews
                api={api}
                workspace={workspace}
                filters={{
                  search,
                  stage,
                  assignee,
                  from,
                  to,
                  focus,
                  sort,
                  mode,
                  company_id: companyId,
                  contact_id: contactId,
                }}
                apply={(v) => {
                  setSearch(v.search || "");
                  setStage(v.stage || "");
                  setAssignee(v.assignee || "");
                  setFrom(v.from || "");
                  setTo(v.to || "");
                  setFocus(v.focus || "");
                  setSort(v.sort || "newest");
                  setMode(v.mode || "kanban");
                  setCompanyId(v.company_id || "");
                  setContactId(v.contact_id || "");
                  setPage(1);
                }}
              />
              {(companyId || contactId) && (
                <p className="crm-linked-filter">
                  Filtrando oportunidades vinculadas ao cadastro selecionado.{" "}
                  <button
                    className="btn"
                    onClick={() => {
                      setCompanyId("");
                      setContactId("");
                      setPage(1);
                    }}
                  >
                    Limpar vínculo
                  </button>
                </p>
              )}
            </>
          )}
          <div className="crm-toolbar">
            <label className="crm-search">
              <Search size={17} />
              <input
                aria-label="Buscar oportunidades"
                placeholder="Buscar nome, empresa, e-mail…"
                value={search}
                onChange={(e) => filters(() => setSearch(e.target.value))}
              />
            </label>
            <select
              aria-label="Filtrar etapa"
              value={stage}
              onChange={(e) => filters(() => setStage(e.target.value))}
            >
              <option value="">Todas as etapas</option>
              {Object.entries(stages).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar responsável"
              value={assignee}
              onChange={(e) => filters(() => setAssignee(e.target.value))}
            >
              <option value="">Todos os responsáveis</option>
              {people.map((p) => (
                <option key={p.actor} value={p.actor}>
                  {p.name || p.email}
                </option>
              ))}
            </select>
            <label>
              Recebido de{" "}
              <input
                type="date"
                aria-label="Recebido a partir de"
                value={from}
                onChange={(e) => filters(() => setFrom(e.target.value))}
              />
            </label>
            <label>
              até{" "}
              <input
                type="date"
                aria-label="Recebido até"
                value={to}
                onChange={(e) => filters(() => setTo(e.target.value))}
              />
            </label>
            <button
              className="btn"
              disabled={!items.length || loading}
              onClick={exportPage}
            >
              <Download size={16} /> Exportar página
            </button>
            {data?.plus_ready && (
              <select
                aria-label="Ordenar oportunidades"
                value={sort}
                onChange={(e) => filters(() => setSort(e.target.value))}
              >
                <option value="newest">Mais recentes</option>
                <option value="amount">Maior valor</option>
                <option value="closing">Previsão de fechamento</option>
                <option value="activity">Próxima atividade</option>
              </select>
            )}
            <button
              className="btn"
              onClick={() => {
                setSearch("");
                setStage("");
                setAssignee("");
                setFrom("");
                setTo("");
                setFocus("");
                setCompanyId("");
                setContactId("");
                setPage(1);
              }}
            >
              Limpar filtros
            </button>
          </div>
          <div className="crm-metrics">
            {[
              ["Oportunidades", data?.metrics.total || 0],
              ["Valor total", money(data?.metrics.amount || 0)],
              [
                "Conversão",
                new Intl.NumberFormat("pt-BR", {
                  style: "percent",
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format(
                  data?.metrics.total
                    ? Number(data.metrics.won) / Number(data.metrics.total)
                    : 0,
                ),
              ],
              ["Fechadas", data?.metrics.won || 0],
              ["Atividades atrasadas", data?.metrics.overdue || 0],
              ["Sem contato há 7 dias", data?.metrics.untouched || 0],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="crm-viewbar">
            <p className="muted">
              {loading
                ? "Atualizando oportunidades…"
                : `${data?.metrics.total || 0} oportunidades · página ${page}`}
            </p>
            <div className="crm-switch" role="group" aria-label="Visualização">
              {[
                ["kanban", "Kanban", LayoutGrid],
                ["list", "Lista", List],
                ["agenda", "Agenda", CalendarDays],
              ].map(([key, label, Icon]: any) => (
                <button
                  key={key}
                  className={mode === key ? "selected" : ""}
                  aria-pressed={mode === key}
                  onClick={() => filters(() => setMode(key))}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="notice error" role="alert">
              {error}{" "}
              <button className="btn" onClick={() => setRefresh((x) => x + 1)}>
                Tentar novamente
              </button>
            </p>
          )}
          {mode === "kanban" && (
            <div className="crm-board" aria-busy={loading}>
              {Object.entries(stages).map(([key, label]) => (
                <section
                  className="crm-column"
                  key={key}
                  style={
                    { "--stage-color": stageColors[key] } as React.CSSProperties
                  }
                  onDragOver={(e) => {
                    if (editable && dragging !== null) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const item = items.find((i) => Number(i.id) === dragging);
                    if (item) void move(item, key);
                  }}
                >
                  <header>
                    <h2>{label}</h2>
                    <span>
                      {data?.counts.find((c: any) => c.stage === key)?.total ||
                        0}
                    </span>
                  </header>
                  {items
                    .filter((i) => i.stage === key)
                    .map((i) => (
                      <article
                        key={i.id}
                        className="crm-card"
                        draggable={editable && !busy}
                        onDragStart={() => setDragging(Number(i.id))}
                        onDragEnd={() => setDragging(null)}
                      >
                        <button
                          className="crm-card-title"
                          disabled={busy}
                          onClick={() => void open(Number(i.id))}
                        >
                          {i.name}
                          <ArrowRight size={14} />
                        </button>
                        <p>{i.company || i.email || "Contato recebido"}</p>
                        <strong>{money(i.amount)}</strong>
                        {i.service && <p>{i.service}</p>}
                        {i.expected_close && (
                          <small>
                            Previsão:{" "}
                            {i.expected_close.split("-").reverse().join("/")}
                          </small>
                        )}
                        {!!Number(i.pending_activities) && (
                          <p
                            className={
                              i.followup_due &&
                              new Date(isoDate(i.followup_due)!) < new Date()
                                ? "crm-overdue"
                                : ""
                            }
                          >
                            {i.pending_activities}{" "}
                            {Number(i.pending_activities) === 1
                              ? "atividade pendente"
                              : "atividades pendentes"}
                            <small>{dateLabel(i.followup_due || null)}</small>
                          </p>
                        )}
                        <small className="crm-source">
                          {i.lead_id ? "Formulário: " : "Origem: "}
                          {i.source}
                        </small>
                        {i.scheduled_at && (
                          <p
                            className={
                              new Date(isoDate(i.scheduled_at)!) < new Date()
                                ? "crm-overdue"
                                : ""
                            }
                          >
                            <CalendarDays size={13} />{" "}
                            {dateLabel(i.scheduled_at)}
                            <small>{i.next_action}</small>
                          </p>
                        )}
                        <footer>
                          {person(i.assignee) ? (
                            <span className="crm-person">
                              <Avatar person={person(i.assignee)!} />
                              {person(i.assignee)!.name ||
                                person(i.assignee)!.email}
                            </span>
                          ) : (
                            <small>
                              <UserRound size={13} /> Sem responsável
                            </small>
                          )}
                        </footer>
                        {editable && (
                          <select
                            aria-label={`Mover ${i.name} para etapa`}
                            disabled={busy}
                            value={i.stage}
                            onChange={(e) => void move(i, e.target.value)}
                          >
                            {Object.entries(stages).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        )}
                      </article>
                    ))}
                  {!items.some((i) => i.stage === key) && (
                    <div className="crm-empty">
                      <Inbox size={25} />
                      <span>Nenhuma oportunidade nesta página</span>
                      <small>
                        {editable
                          ? "Arraste um cartão para cá"
                          : "As oportunidades aparecerão aqui"}
                      </small>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
          {mode !== "kanban" && (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Contato / empresa</th>
                    <th>Etapa</th>
                    <th>Responsável</th>
                    <th>Valor</th>
                    {data?.plus_ready && <th>Serviço / previsão</th>}
                    <th>Próxima atividade</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <button
                          className="crm-card-title"
                          disabled={busy}
                          onClick={() => void open(Number(i.id))}
                        >
                          {i.name}
                        </button>
                        <small>{i.company || i.email}</small>
                      </td>
                      <td>
                        {editable ? (
                          <select
                            aria-label={`Mover ${i.name} para etapa`}
                            value={i.stage}
                            disabled={busy || loading}
                            onChange={(e) => void move(i, e.target.value)}
                          >
                            {Object.entries(stages).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          stages[i.stage]
                        )}
                      </td>
                      <td>
                        {person(i.assignee)?.name ||
                          person(i.assignee)?.email ||
                          "Sem responsável"}
                      </td>
                      <td>{money(i.amount)}</td>
                      {data?.plus_ready && (
                        <td>
                          {i.service || "—"}
                          <small>
                            {i.expected_close?.split("-").reverse().join("/") ||
                              "Sem previsão"}
                          </small>
                        </td>
                      )}
                      <td>
                        {i.next_action}
                        {(i.scheduled_at || !Number(i.pending_activities)) && (
                          <small>{dateLabel(i.scheduled_at)}</small>
                        )}
                        {!!Number(i.pending_activities) && (
                          <small>
                            {i.pending_activities}{" "}
                            {Number(i.pending_activities) === 1
                              ? "pendente"
                              : "pendentes"}{" "}
                            · {dateLabel(i.followup_due || null)}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && !loading && (
                <p className="crm-empty">
                  {mode === "agenda"
                    ? "Nenhuma atividade agendada. Abra uma oportunidade para definir o próximo passo."
                    : "Nenhuma oportunidade encontrada."}
                </p>
              )}
            </div>
          )}
          <div className="crm-pagination">
            <button
              className="btn"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <small>
              Até 100 cartões por página · métricas de todos os resultados
              filtrados
            </small>
            <button
              className="btn"
              disabled={
                loading || page * 100 >= Number(data?.metrics.total || 0)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
      {selected && (
        <OpportunityDialog
          key={selected.item.id}
          initial={selected}
          commercial={commercial}
          api={api}
          workspace={workspace}
          editable={editable}
          stages={stages}
          people={people}
          close={() => {
            setSelected(null);
            setRefresh((x) => x + 1);
          }}
          saved={() => {
            setSelected(null);
            setRefresh((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}

export function OpportunityDialog({
  initial,
  api,
  workspace,
  editable,
  stages,
  people,
  close,
  saved,
  commercial = false,
}: {
  initial: any;
  api: Api;
  workspace: number;
  editable: boolean;
  stages: Record<string, string>;
  people: Person[];
  close: () => void;
  saved: () => void;
  commercial?: boolean;
}) {
  const [item, setItem] = useState<Opportunity & { create_key?: string }>(
    initial.item,
  );
  const [detail, setDetail] = useState(initial);
  async function reloadDetail() {
    const r = await api("crm-item", undefined, { workspace, id: item.id });
    setDetail(r);
    setItem(r.item);
    setSchedule(localDate(r.item.scheduled_at));
  }
  const [schedule, setSchedule] = useState(
    localDate(initial.item.scheduled_at),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const [activityState, setActivityState] = useState({
    busy: false,
    dirty: false,
  });
  const change = (key: string, value: unknown) => {
    setDirty(true);
    setItem({ ...item, [key]: value });
  };
  const dismiss = () => {
    if (busy || activityState.busy) return;
    if (
      (!dirty && !note.trim() && !activityState.dirty) ||
      confirm("Descartar alterações não salvas desta oportunidade?")
    )
      close();
  };
  async function action(type: string, extra: object = {}) {
    if (activityState.busy || activityState.dirty) {
      setError("Salve ou feche o formulário da atividade antes de continuar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(type, {
        ...item,
        workspace,
        scheduled_at: utcInput(schedule),
        ...extra,
      });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item.id ? "Detalhes da oportunidade" : "Nova oportunidade"}
      close={dismiss}
      busy={busy || activityState.busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action(item.id ? "crm-update" : "crm-create");
        }}
      >
        {initial.plus_ready && (
          <section className="crm-opportunity-links">
            <h3>Relacionamentos</h3>
            <p className="muted">
              Vincule cadastros existentes. Ao selecionar, os dados de contato
              são preenchidos abaixo; mudanças futuras no cadastro não alteram
              esta negociação automaticamente.
            </p>
            <div className="crm-fields">
              <DirectoryPicker
                api={api}
                workspace={workspace}
                kind="company"
                label="Empresa cadastrada"
                value={item.company_id || null}
                disabled={!editable || busy}
                onChange={(r) => {
                  setDirty(true);
                  setItem((i) => ({
                    ...i,
                    company_id: r?.id || null,
                    contact_id: null,
                    ...(r
                      ? { company: r.name, document: r.document || i.document }
                      : {}),
                  }));
                }}
              />
              <DirectoryPicker
                api={api}
                workspace={workspace}
                kind="contact"
                label="Contato principal"
                value={item.contact_id || null}
                companyId={item.company_id || null}
                disabled={!editable || busy}
                onChange={(r) => {
                  setDirty(true);
                  setItem((i) => ({
                    ...i,
                    contact_id: r?.id || null,
                    ...(r
                      ? { name: r.name, email: r.email, phone: r.phone }
                      : {}),
                  }));
                }}
              />
            </div>
          </section>
        )}
        <fieldset
          disabled={!editable || busy || activityState.busy}
          className="crm-fields"
        >
          <Control label="Nome do contato *">
            <input
              required
              maxLength={150}
              value={item.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </Control>
          <Control label="Empresa">
            <input
              maxLength={150}
              value={item.company}
              onChange={(e) => change("company", e.target.value)}
            />
          </Control>
          <Control label="E-mail">
            <input
              type="email"
              maxLength={254}
              value={item.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </Control>
          <Control label="Telefone / WhatsApp">
            <input
              type="tel"
              maxLength={40}
              value={item.phone}
              onChange={(e) => change("phone", e.target.value)}
            />
          </Control>
          <Control label="CPF/CNPJ (opcional)">
            <input
              maxLength={25}
              value={item.document}
              onChange={(e) => change("document", e.target.value)}
            />
          </Control>
          <Control label="Valor da oportunidade (R$)">
            <input
              type="number"
              min="0"
              max="99999999999.99"
              step="0.01"
              value={item.amount}
              onChange={(e) => change("amount", e.target.value)}
            />
          </Control>
          <Control label="Etapa">
            <select
              value={item.stage}
              onChange={(e) => change("stage", e.target.value)}
            >
              {Object.entries(stages).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Responsável">
            <select
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
          <Control label="Origem">
            <input
              maxLength={150}
              value={item.source}
              readOnly={!!item.lead_id}
              onChange={(e) => change("source", e.target.value)}
            />
          </Control>
          <Control label="Próxima atividade">
            <input
              maxLength={200}
              placeholder="Ex.: reunião de diagnóstico"
              value={item.next_action}
              onChange={(e) => change("next_action", e.target.value)}
            />
          </Control>
          <Control label="Agendar (horário deste dispositivo)">
            <input
              type="datetime-local"
              value={schedule}
              onChange={(e) => {
                setSchedule(e.target.value);
                setDirty(true);
              }}
            />
          </Control>
          <Control label="Observações">
            <textarea
              rows={4}
              maxLength={10000}
              value={item.notes}
              onChange={(e) => change("notes", e.target.value)}
            />
          </Control>
          {initial.plus_ready && (
            <>
              <Control label="Serviço de interesse">
                <input
                  maxLength={150}
                  placeholder="Ex.: site institucional, campanhas"
                  value={item.service || ""}
                  onChange={(e) => change("service", e.target.value)}
                />
              </Control>
              <Control label="Previsão de fechamento">
                <input
                  type="date"
                  value={item.expected_close || ""}
                  onChange={(e) =>
                    change("expected_close", e.target.value || null)
                  }
                />
              </Control>
              <Control label="Motivo de perda / desqualificação">
                <textarea
                  maxLength={1000}
                  rows={2}
                  placeholder="Preencha quando a negociação não avançar"
                  value={item.loss_reason || ""}
                  onChange={(e) => change("loss_reason", e.target.value)}
                />
              </Control>
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="notice error">
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
          {editable && (
            <button className="btn primary" disabled={busy}>
              {busy
                ? "Salvando…"
                : item.id
                  ? "Salvar alterações"
                  : "Criar oportunidade"}
            </button>
          )}
        </div>
      </form>
      {!!item.id && (
        <>
          {initial.plus_ready && (
            <CrmActivities
              api={api}
              workspace={workspace}
              id={Number(item.id)}
              items={detail.activities || []}
              editable={editable}
              disabled={dirty || busy || !!note.trim()}
              reload={reloadDetail}
              onStateChange={setActivityState}
            />
          )}
          <hr />
          <h3>Relacionamento</h3>
          <p className="muted">
            Último contato:{" "}
            {item.last_contact_at
              ? dateLabel(item.last_contact_at)
              : "Ainda não registrado"}
          </p>
          {editable && (
            <div className="crm-actions">
              <button
                className="btn"
                disabled={busy || dirty}
                onClick={() => void action("crm-contact")}
              >
                <Phone size={15} /> Registrar contato
              </button>
              {item.scheduled_at && (
                <button
                  className="btn"
                  disabled={busy || dirty}
                  onClick={() => void action("crm-complete")}
                >
                  <Check size={15} /> Concluir atividade
                </button>
              )}
            </div>
          )}
          {dirty && (
            <small>
              Salve as alterações antes de registrar contato ou adicionar uma
              nota.
            </small>
          )}
          {editable && (
            <form
              className="crm-note"
              onSubmit={(e) => {
                e.preventDefault();
                void action("crm-note", { message: note });
              }}
            >
              <Control label="Adicionar nota ao histórico">
                <textarea
                  required
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Control>
              <button className="btn" disabled={busy || dirty || !note.trim()}>
                Adicionar nota
              </button>
            </form>
          )}
          {!!initial.answers.length && (
            <details>
              <summary>Respostas originais do formulário</summary>
              <dl className="crm-answers">
                {initial.answers.map((a: any, i: number) => (
                  <div key={i}>
                    <dt>{a.label}</dt>
                    <dd>{a.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          <h3 className="crm-history-title">Histórico</h3>
          <ol className="crm-history">
            {detail.events.map((event: any) => (
              <li key={event.id}>
                <p>{event.message}</p>
                <small>
                  {event.actor_name ||
                    people.find((p) => p.actor === event.actor)?.email ||
                    "Sistema"}{" "}
                  · {dateLabel(event.created_at)}
                </small>
              </li>
            ))}
          </ol>
        </>
      )}
      {commercial && item.id > 0 && (
        <SalesControl api={api} id={Number(item.id)} disabled={dirty || busy} />
      )}
    </Modal>
  );
}

export function ProfilePanel({
  profile,
  api,
  request,
  onSaved,
}: {
  profile: Profile;
  api: Api;
  request: Request;
  onSaved: (p: Profile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [appearance, setAppearance] = useState(profile.appearance);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice("Alterações salvas.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-page">
      <p className="eyebrow">SUA CONTA</p>
      <h1>Meu perfil</h1>
      <p className="muted">
        Seu nome e sua foto identificam você para a equipe.
      </p>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <section className="profile-box">
        <h2>Informações pessoais</h2>
        <div className="profile-photo">
          <Avatar person={profile} />
          <div>
            <strong>{profile.name || profile.email}</strong>
            <p>{profile.email}</p>
            <label className="btn">
              Alterar foto
              <input
                aria-label="Enviar foto do perfil"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void run(async () => {
                    if (file.size > 2 * 1024 * 1024)
                      throw new Error("Use uma foto de até 2 MB.");
                    const body = new FormData();
                    body.append("file", file);
                    const r = await request("/api/profile-photo.php", {
                      method: "POST",
                      body,
                    });
                    onSaved(r.profile);
                  });
                }}
              />
            </label>
            {profile.avatar_url && (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const body = new FormData();
                    body.append("remove", "1");
                    onSaved(
                      (
                        await request("/api/profile-photo.php", {
                          method: "POST",
                          body,
                        })
                      ).profile,
                    );
                  })
                }
              >
                Remover foto
              </button>
            )}
            <small>
              JPG, PNG ou WebP · até 2 MB e 4096 pixels por lado. Visível à
              equipe.
            </small>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              onSaved(
                (await api("profile-save", { name, phone, appearance }))
                  .profile,
              );
            });
          }}
        >
          <fieldset disabled={busy} className="profile-fields">
            <Control label="E-mail de acesso">
              <input value={profile.email} readOnly />
            </Control>
            <small>O e-mail de acesso não é alterado nesta tela.</small>
            <Control label="Nome completo">
              <input
                required
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Control>
            <Control label="WhatsApp">
              <input
                type="tel"
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Control>
            <h3>Aparência das áreas de gestão e perfil</h3>
            <div className="profile-theme">
              {(["light", "dark"] as const).map((t) => (
                <label key={t}>
                  <input
                    type="radio"
                    name="appearance"
                    checked={appearance === t}
                    onChange={() => setAppearance(t)}
                  />
                  {t === "light" ? "Claro" : "Escuro"}
                </label>
              ))}
            </div>
            <button className="btn primary">Salvar alterações</button>
          </fieldset>
        </form>
      </section>
      <section className="profile-box">
        <h2>Segurança</h2>
        <p className="muted">
          Ao mudar a senha, outros acessos com a senha anterior serão
          invalidados.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const d = new FormData(form);
            void run(async () => {
              if (d.get("password") !== d.get("confirm"))
                throw new Error("As novas senhas não coincidem.");
              await api("profile-password", {
                current: d.get("current"),
                password: d.get("password"),
              });
              form.reset();
            });
          }}
        >
          <fieldset disabled={busy} className="profile-fields">
            <Control label="Senha atual">
              <input
                type="password"
                name="current"
                required
                autoComplete="current-password"
              />
            </Control>
            <Control label="Nova senha (12 a 72 bytes)">
              <input
                type="password"
                name="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </Control>
            <Control label="Confirme a nova senha">
              <input
                type="password"
                name="confirm"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </Control>
            <button className="btn">Alterar senha</button>
          </fieldset>
        </form>
      </section>
    </section>
  );
}
