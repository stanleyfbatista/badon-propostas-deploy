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

export type Api = (
  action: string,
  data?: unknown,
  query?: Record<string, string | number>,
) => Promise<any>;
export type Request = (url: string, init?: RequestInit) => Promise<any>;
type Person = {
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
function Modal({
  title,
  children,
  close,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  busy?: boolean;
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
      className="crm-modal"
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
function Control({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="control">
      <span>{label}</span>
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
}: {
  api: Api;
  workspace: number;
  editable: boolean;
  agenda?: boolean;
}) {
  const [mode, setMode] = useState(agenda ? "agenda" : "kanban");
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
  }, [workspace, search, stage, assignee, from, to, page, mode, refresh]);
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
        {editable && (
          <button
            className="btn primary"
            disabled={busy || !data}
            onClick={() =>
              setSelected({ item: blank(), events: [], answers: [] })
            }
          >
            <Plus size={17} /> Nova oportunidade
          </button>
        )}
      </div>
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
      </div>
      <div className="crm-metrics">
        {[
          ["Oportunidades", data?.metrics.total || 0],
          ["Valor total", money(data?.metrics.amount || 0)],
          [
            "Conversão",
            data?.metrics.total
              ? (
                  (Number(data.metrics.won) / Number(data.metrics.total)) *
                  100
                ).toFixed(1) + "%"
              : "0%",
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
                  {data?.counts.find((c: any) => c.stage === key)?.total || 0}
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
                        <CalendarDays size={13} /> {dateLabel(i.scheduled_at)}
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
                  <td>{stages[i.stage]}</td>
                  <td>
                    {person(i.assignee)?.name ||
                      person(i.assignee)?.email ||
                      "Sem responsável"}
                  </td>
                  <td>{money(i.amount)}</td>
                  <td>
                    {i.next_action}
                    <small>{dateLabel(i.scheduled_at)}</small>
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
          Até 100 cartões por página · métricas de todos os resultados filtrados
        </small>
        <button
          className="btn"
          disabled={loading || page * 100 >= Number(data?.metrics.total || 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
      {selected && (
        <OpportunityDialog
          key={selected.item.id}
          initial={selected}
          api={api}
          workspace={workspace}
          editable={editable}
          stages={stages}
          people={people}
          close={() => setSelected(null)}
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
}: {
  initial: any;
  api: Api;
  workspace: number;
  editable: boolean;
  stages: Record<string, string>;
  people: Person[];
  close: () => void;
  saved: () => void;
}) {
  const [item, setItem] = useState<Opportunity & { create_key?: string }>(
    initial.item,
  );
  const [schedule, setSchedule] = useState(
    localDate(initial.item.scheduled_at),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  const change = (key: string, value: unknown) => {
    setDirty(true);
    setItem({ ...item, [key]: value });
  };
  const dismiss = () => {
    if (
      (!dirty && !note.trim()) ||
      confirm("Descartar alterações não salvas desta oportunidade?")
    )
      close();
  };
  async function action(type: string, extra: object = {}) {
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
      busy={busy}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action(item.id ? "crm-update" : "crm-create");
        }}
      >
        <fieldset disabled={!editable || busy} className="crm-fields">
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
            {initial.events.map((event: any) => (
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
            <h3>Aparência do CRM e perfil</h3>
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
