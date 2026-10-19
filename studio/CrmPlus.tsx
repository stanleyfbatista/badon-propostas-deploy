import React, { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Plus,
  Search,
  Bookmark,
  Check,
  Clock,
} from "lucide-react";
import { Api, Modal, Control, localDate, isoDate, utcInput } from "./Crm";
import "./crm-plus.css";

export type DirectoryRecord = {
  id: number;
  revision: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  company_id?: number | null;
  company_name?: string;
  job_title?: string;
  document?: string;
  contacts_count?: number;
  create_key?: string;
};
type Kind = "company" | "contact";
const title = (kind: Kind) => (kind === "company" ? "empresa" : "contato");
export const activityKinds: Record<string, string> = {
  call: "Ligação",
  meeting: "Reunião",
  email: "E-mail",
  task: "Tarefa",
  note: "Nota",
};
const readable = (date: string | null) =>
  date
    ? new Date(isoDate(date)!).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sem data";

export function DirectoryPicker({
  api,
  workspace,
  kind,
  value,
  onChange,
  companyId,
  label,
  disabled = false,
}: {
  api: Api;
  workspace: number;
  kind: Kind;
  value: number | null;
  onChange: (r: DirectoryRecord | null) => void;
  companyId?: number | null;
  label: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DirectoryRecord[]>([]);
  const [selected, setSelected] = useState<DirectoryRecord | null>(null);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    setSelected(null);
    if (value)
      api("crm-plus-directory", undefined, { workspace, kind, id: value })
        .then((r) => {
          if (alive) setSelected(r.items[0] || null);
        })
        .catch(() => {
          if (alive) setError("Não foi possível carregar o cadastro.");
        });
    return () => {
      alive = false;
    };
  }, [api, workspace, kind, value]);
  useEffect(() => {
    if (!opened) return;
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api("crm-plus-directory", undefined, {
        workspace,
        kind,
        search,
        ...(kind === "contact" ? { company_id: companyId || 0 } : {}),
      })
        .then((r) => {
          if (alive) setRows(r.items);
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
  }, [opened, search, workspace, kind, companyId]);
  return (
    <div className="crm-picker">
      <span className="crm-field-label">{label}</span>
      <button
        type="button"
        className="btn crm-picker-trigger"
        disabled={disabled}
        aria-expanded={opened}
        onClick={() => setOpened(!opened)}
      >
        {kind === "company" ? <Building2 size={17} /> : <Users size={17} />}{" "}
        {selected?.name ||
          (value ? "Carregando cadastro…" : `Selecionar ${title(kind)}`)}
      </button>
      {opened && (
        <div className="crm-picker-panel">
          <input
            aria-label={
              kind === "company"
                ? "Buscar empresa cadastrada"
                : "Buscar contato cadastrado"
            }
            placeholder={`Buscar ${title(kind)} por nome ou e-mail`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              onChange(null);
              setOpened(false);
            }}
          >
            Sem vínculo
          </button>
          {error && <p role="alert">{error}</p>}
          {loading ? (
            <p role="status">Buscando…</p>
          ) : (
            rows.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => {
                  onChange(r);
                  setSelected(r);
                  setOpened(false);
                }}
              >
                <strong>{r.name}</strong>
                <small>
                  {r.email || r.phone || "Cadastro sem contato informado"}
                </small>
              </button>
            ))
          )}
          {!loading && !rows.length && (
            <p>
              Nenhum cadastro encontrado. Cadastre na aba{" "}
              {kind === "company" ? "Empresas" : "Contatos"} do CRM.
            </p>
          )}
          {rows.length === 50 && (
            <small>Mostrando 50 resultados. Digite mais para refinar.</small>
          )}
        </div>
      )}
    </div>
  );
}

export function CrmDirectory({
  api,
  workspace,
  kind,
  editable,
  onOpportunities,
}: {
  api: Api;
  workspace: number;
  kind: Kind;
  editable: boolean;
  onOpportunities: (kind: Kind, r: DirectoryRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<{ items: DirectoryRecord[]; total: number }>(
    { items: [], total: 0 },
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DirectoryRecord | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () =>
        api("crm-plus-directory", undefined, { workspace, kind, search, page })
          .then((r) => {
            if (alive) setData(r);
          })
          .catch((e) => {
            if (alive) setError(e.message);
          })
          .finally(() => {
            if (alive) setLoading(false);
          }),
      180,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [workspace, kind, search, page, refresh]);
  return (
    <section className="crm-directory">
      <div className="crm-directory-heading">
        <div>
          <h2>{kind === "company" ? "Empresas" : "Contatos"}</h2>
          <p className="muted">
            {kind === "company"
              ? "Um cadastro por empresa. Pessoas e oportunidades conectadas."
              : "As pessoas com quem você conversa, organizadas por empresa."}
          </p>
        </div>
        {editable && (
          <button
            className="btn primary"
            onClick={() =>
              setEditing({
                id: 0,
                revision: 0,
                name: "",
                email: "",
                phone: "",
                notes: "",
                company_id: null,
                job_title: "",
                document: "",
                create_key: crypto.randomUUID(),
              })
            }
          >
            <Plus size={17} />
            {kind === "company" ? "Nova empresa" : "Novo contato"}
          </button>
        )}
      </div>
      <label className="crm-search">
        <Search size={17} />
        <input
          aria-label="Buscar cadastros"
          placeholder="Buscar nome, e-mail ou telefone"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {error && (
        <p role="alert" className="notice error">
          {error}
          <button className="btn" onClick={() => setRefresh((x) => x + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      <div className="crm-table-wrap" aria-busy={loading}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>{kind === "company" ? "Empresa" : "Contato"}</th>
              <th>
                {kind === "company" ? "Contatos vinculados" : "Empresa / cargo"}
              </th>
              <th>E-mail / telefone</th>
              <th>Relacionamento</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <td>
                  <button
                    className="crm-card-title"
                    onClick={() => setEditing(r)}
                  >
                    {r.name}
                  </button>
                </td>
                <td>
                  {kind === "company"
                    ? `${r.contacts_count || 0} ${Number(r.contacts_count) === 1 ? "contato" : "contatos"}`
                    : r.company_name || "Sem empresa"}
                  {kind === "contact" && <small>{r.job_title}</small>}
                </td>
                <td>
                  {r.email || "Não informado"}
                  <small>{r.phone}</small>
                </td>
                <td>
                  <button
                    className="btn"
                    onClick={() => onOpportunities(kind, r)}
                  >
                    Ver oportunidades
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && !loading && (
          <div className="crm-empty">
            <Building2 size={28} />
            <strong>
              {search
                ? "Nenhum cadastro encontrado"
                : "Vamos organizar seus relacionamentos"}
            </strong>
            <p>
              {search
                ? "Tente outro nome ou e-mail."
                : "Cadastre empresas e contatos para vinculá-los às oportunidades. Os registros antigos continuam preservados."}
            </p>
          </div>
        )}
      </div>
      <div className="crm-pagination">
        <button
          className="btn"
          disabled={page === 1 || loading}
          onClick={() => setPage((x) => x - 1)}
        >
          Anterior
        </button>
        <small>
          {data.total} {Number(data.total) === 1 ? "cadastro" : "cadastros"} ·
          página {page}
        </small>
        <button
          className="btn"
          disabled={page * 50 >= data.total || loading}
          onClick={() => setPage((x) => x + 1)}
        >
          Próxima
        </button>
      </div>
      {editing && (
        <DirectoryEditor
          key={editing.id}
          api={api}
          workspace={workspace}
          kind={kind}
          initial={editing}
          editable={editable}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            setRefresh((x) => x + 1);
          }}
        />
      )}
    </section>
  );
}
function DirectoryEditor({
  api,
  workspace,
  kind,
  initial,
  editable,
  close,
  saved,
}: {
  api: Api;
  workspace: number;
  kind: Kind;
  initial: DirectoryRecord;
  editable: boolean;
  close: () => void;
  saved: () => void;
}) {
  const [row, setRow] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const change = (key: string, value: unknown) => {
    setDirty(true);
    setRow((r) => ({ ...r, [key]: value }));
  };
  const dismiss = () => {
    if (!dirty || confirm("Descartar alterações não salvas deste cadastro?"))
      close();
  };
  return (
    <Modal
      title={`${initial.id ? "Editar" : "Cadastrar"} ${title(kind)}`}
      close={dismiss}
      busy={busy}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("crm-plus-directory-save", { ...row, workspace, kind });
            saved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="crm-fields" disabled={busy || !editable}>
          <Control label="Nome *">
            <input
              required
              maxLength={150}
              value={row.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </Control>
          {kind === "company" ? (
            <Control label="CPF/CNPJ">
              <input
                maxLength={25}
                value={row.document || ""}
                onChange={(e) => change("document", e.target.value)}
              />
            </Control>
          ) : (
            <>
              <DirectoryPicker
                api={api}
                workspace={workspace}
                kind="company"
                label="Empresa vinculada"
                value={row.company_id || null}
                onChange={(r) => change("company_id", r?.id || null)}
                disabled={!editable || busy}
              />
              <Control label="Cargo">
                <input
                  maxLength={150}
                  value={row.job_title || ""}
                  onChange={(e) => change("job_title", e.target.value)}
                />
              </Control>
            </>
          )}
          <Control label="E-mail">
            <input
              type="email"
              maxLength={254}
              value={row.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </Control>
          <Control label="Telefone">
            <input
              type="tel"
              maxLength={40}
              value={row.phone}
              onChange={(e) => change("phone", e.target.value)}
            />
          </Control>
          <Control label="Observações">
            <textarea
              rows={4}
              maxLength={10000}
              value={row.notes}
              onChange={(e) => change("notes", e.target.value)}
            />
          </Control>
        </fieldset>
        <p className="muted">
          Este cadastro não cria acesso ao portal. Alterações aqui não
          sobrescrevem os dados comerciais das oportunidades já registradas.
        </p>
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
          {editable && (
            <button className="btn primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar cadastro"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

export function CrmSavedViews({
  api,
  workspace,
  filters,
  apply,
}: {
  api: Api;
  workspace: number;
  filters: Record<string, string>;
  apply: (v: Record<string, string>) => void;
}) {
  const [views, setViews] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api("crm-plus-views", undefined, { workspace })
      .then((r) => {
        if (alive) setViews(r.items);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [workspace, refresh]);
  return (
    <div className="crm-saved">
      <Bookmark size={17} />
      <select
        aria-label="Meus filtros salvos"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          const v = views.find((v) => String(v.id) === e.target.value);
          if (v) apply(v.filters);
        }}
      >
        <option value="">Meus filtros salvos</option>
        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
      <button
        className="btn"
        onClick={() => {
          setSaving(true);
          setError("");
        }}
      >
        Salvar filtros atuais
      </button>
      {selected && (
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            if (
              !confirm(
                "Remover este filtro salvo? Os contatos e oportunidades não serão alterados.",
              )
            )
              return;
            setBusy(true);
            setError("");
            try {
              await api("crm-plus-view-delete", {
                workspace,
                id: Number(selected),
              });
              setSelected("");
              setRefresh((x) => x + 1);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Remover filtro salvo
        </button>
      )}
      <small>Privados, salvos na sua conta.</small>
      {error && !saving && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {saving && (
        <Modal
          title="Salvar filtros"
          close={() => {
            if (!busy) setSaving(false);
          }}
          busy={busy}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("crm-plus-view-save", { workspace, name, filters });
                setRefresh((x) => x + 1);
                setSaving(false);
                setName("");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Control label="Nome do filtro">
              <input
                required
                maxLength={80}
                placeholder="Ex.: Leads de sites sem retorno"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Control>
            <p className="muted">
              Guarda busca, etapa, responsável, período e visualização. Não cria
              cópias dos registros.
            </p>
            {error && (
              <p role="alert" className="notice error">
                {error}
              </p>
            )}
            <button className="btn primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar filtro"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function CrmActivities({
  api,
  workspace,
  id,
  items,
  editable,
  disabled,
  reload,
  onStateChange,
}: {
  api: Api;
  workspace: number;
  id: number;
  items: any[];
  editable: boolean;
  disabled: boolean;
  reload: () => Promise<void>;
  onStateChange: (state: { busy: boolean; dirty: boolean }) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [completed, setCompleted] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    onStateChange({
      busy,
      dirty: adding && !!(subject.trim() || body.trim() || due || completed),
    });
  }, [busy, adding, subject, body, due, completed, onStateChange]);
  async function run(action: string, data: object) {
    setBusy(true);
    setError("");
    try {
      await api(action, { workspace, id, ...data });
      await reload();
      setAdding(false);
      setSubject("");
      setBody("");
      setDue("");
      setCompleted(false);
      setKey(crypto.randomUUID());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="crm-activities">
      <div className="crm-directory-heading">
        <div>
          <h3>Atividades e follow-up</h3>
          <p className="muted">
            Agende o próximo passo ou registre uma conversa já realizada.
          </p>
        </div>
        {editable && (
          <button
            className="btn"
            disabled={disabled || busy}
            onClick={() => setAdding(!adding)}
          >
            <Plus size={16} />
            {adding ? "Fechar formulário" : "Nova atividade"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run("crm-plus-activity-add", {
              kind,
              subject,
              body,
              due_at: utcInput(due),
              completed,
              create_key: key,
            });
          }}
        >
          <fieldset className="crm-fields" disabled={busy || disabled}>
            <Control label="Tipo">
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {Object.entries(activityKinds).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Control>
            <Control label="Assunto *">
              <input
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex.: conversar sobre a proposta"
              />
            </Control>
            <Control label="Data e hora neste dispositivo">
              <input
                type="datetime-local"
                required={!completed}
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </Control>
            <Control label="Detalhes">
              <textarea
                rows={3}
                maxLength={4000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </Control>
            <label className="crm-done-choice">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              Já realizada
            </label>
            <button className="btn primary">
              {busy ? "Salvando…" : "Salvar atividade"}
            </button>
          </fieldset>
          <small>
            O registro de e-mail é manual: nenhum e-mail será enviado por esta
            ação.
          </small>
        </form>
      )}
      <ol className="crm-activity-list">
        {items.map((a) => (
          <li
            key={a.id}
            className={
              !a.completed_at &&
              a.due_at &&
              new Date(isoDate(a.due_at)!) < new Date()
                ? "is-overdue"
                : ""
            }
          >
            <span>
              {a.completed_at ? <Check size={18} /> : <Clock size={18} />}
            </span>
            <div>
              <small>
                {activityKinds[a.kind]} ·{" "}
                {a.completed_at ? "Concluída" : "Pendente"}
              </small>
              <strong>{a.subject}</strong>
              {a.body && <p>{a.body}</p>}
              <small>{readable(a.completed_at || a.due_at)}</small>
            </div>
            {!a.completed_at && editable && (
              <button
                className="btn"
                disabled={disabled || busy}
                onClick={() =>
                  void run("crm-plus-activity-complete", { activity_id: a.id })
                }
              >
                Concluir
              </button>
            )}
          </li>
        ))}
      </ol>
      {!items.length && (
        <p className="muted">
          Nenhuma atividade registrada aqui. Seu agendamento e histórico
          anteriores continuam abaixo.
        </p>
      )}
      {items.length === 200 && (
        <small>Mostrando até 200 atividades, com pendências primeiro.</small>
      )}
    </section>
  );
}
