import React, { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  Plus,
  Search,
  Users,
  Clock,
  Check,
  LayoutGrid,
  List,
  BriefcaseBusiness,
} from "lucide-react";
import { Api, Control, Modal } from "./Crm";
import { todayLocal, dueLabel } from "./task-model";
import { FlowUpload } from "./FlowFiles";
import { ClientCover, ClientMark } from "./FlowWorkspace";

type Client = {
  workspace_id: number;
  revision: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  document: string;
  active: boolean;
  details: Record<string, any>;
  counts?: { projects: number; demands: number; approvals: number };
  create_key?: string;
  existing_workspace?: number;
};
const blankClient = (): Client => ({
  workspace_id: 0,
  revision: 1,
  name: "",
  contact: "",
  email: "",
  phone: "",
  document: "",
  active: true,
  details: {
    color: "#0053c3",
    resources: [],
    contract_status: "none",
    notice_days: 30,
  },
  create_key: crypto.randomUUID(),
});
const textSearch = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const money = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const time = (v: string) =>
  v ? new Date(v.replace(" ", "T") + "Z").toLocaleString("pt-BR") : "—";
export function contractState(d: Record<string, any>, today = todayLocal()) {
  if (!d.contract_status || d.contract_status === "none")
    return "Não cadastrado";
  if (d.contract_status === "draft") return "Rascunho";
  if (d.contract_status === "closed") return "Encerrado";
  if (d.contract_start && d.contract_start > today) return "Início futuro";
  if (d.contract_end && d.contract_end < today) return "Vencido";
  const limit = new Date(today + "T12:00:00");
  limit.setDate(limit.getDate() + Number(d.notice_days || 30));
  const end = [
    limit.getFullYear(),
    String(limit.getMonth() + 1).padStart(2, "0"),
    String(limit.getDate()).padStart(2, "0"),
  ].join("-");
  return d.contract_end && d.contract_end <= end ? "A vencer" : "Vigente";
}
export function FlowOverview({
  api,
  navigate,
}: {
  api: Api;
  navigate: (view: string, workspace?: number) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    let alive = true;
    api("flow-overview", undefined, { today: todayLocal() })
      .then((r) => {
        if (alive) setData(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (error)
    return (
      <p role="alert" className="notice error">
        {error}
      </p>
    );
  if (!data) return <p role="status">Carregando sua visão geral…</p>;
  const tasks = data.tasks as any[],
    late = tasks.filter((t) => t.due_date && t.due_date < data.today),
    near = tasks.filter(
      (t) => t.due_date >= data.today && t.due_date <= data.attention_end,
    );
  const review = tasks.filter((t) => t.status === "review"),
    shown =
      filter === "late"
        ? late
        : filter === "near"
          ? near
          : filter === "review"
            ? review
            : tasks;
  const lateProjects = new Set(
    late.map((t) => t.workspace_id + ":" + (t.project_id || "sem-projeto")),
  ).size;
  return (
    <section className="flow-page">
      <p className="eyebrow">/ VISÃO GERAL /</p>
      <h1>Bom trabalho começa com clareza.</h1>
      <p className="muted">
        Da primeira conversa à entrega. Tudo conectado, com a Bādon.
      </p>
      <div className="flow-hero">
        <div>
          <p className="eyebrow">GENTE DE VERDADE, PERTO DO SEU NEGÓCIO.</p>
          <h2>
            Um só lugar para fazer
            <br />
            as coisas acontecerem.
          </h2>
          <p>Funis, relacionamento e projetos no mesmo fluxo.</p>
        </div>
        <button className="btn" onClick={() => navigate("crm")}>
          Abrir CRM <ArrowRight size={17} />
        </button>
      </div>
      <div className="flow-stats">
        <button onClick={() => navigate("clients")}>
          <span>
            Clientes ativos <Users size={18} />
          </span>
          <strong>{data.clients}</strong>
          <small>Cada cliente, um espaço próprio</small>
        </button>
        <button onClick={() => setFilter("all")}>
          <span>
            Em andamento <BriefcaseBusiness size={18} />
          </span>
          <strong>{tasks.length}</strong>
          <small>Demandas abertas visíveis para você</small>
        </button>
        <button className="blue" onClick={() => setFilter("review")}>
          <span>
            Aguardando aprovação <Check size={18} />
          </span>
          <strong>{review.length}</strong>
          <small>Materiais em revisão</small>
        </button>
        <button
          className={near.length ? "amber" : ""}
          onClick={() => setFilter("near")}
        >
          <span>
            Prazos próximos <Clock size={18} />
          </span>
          <strong>{near.length}</strong>
          <small>Hoje e nos próximos 3 dias</small>
        </button>
      </div>
      {!!late.length && (
        <button className="flow-alert red" onClick={() => setFilter("late")}>
          <Clock />
          <span>
            <strong>
              {lateProjects} grupo(s) de projetos com entregas em atraso
            </strong>
            <small>
              {late.length} demanda(s) com prazo vencido. Revise as pendências.
            </small>
          </span>
          <ArrowRight />
        </button>
      )}
      <div className="flow-two">
        <section className="flow-panel">
          <div className="flow-heading">
            <h2>
              {filter === "late"
                ? "Entregas em atraso"
                : filter === "near"
                  ? "Prazos próximos"
                  : filter === "review"
                    ? "Aguardando aprovação"
                    : "Demandas em movimento"}
            </h2>
            <button className="btn" onClick={() => setFilter("all")}>
              Todas
            </button>
          </div>
          {shown.slice(0, 20).map((t) => (
            <button
              key={t.id}
              className="flow-row"
              onClick={() => navigate("tasks", Number(t.workspace_id))}
            >
              <span>
                <strong>{t.title}</strong>
                <small>{t.client}</small>
              </span>
              <small
                className={
                  t.due_date && t.due_date < data.today ? "flow-red" : ""
                }
              >
                {dueLabel(t.due_date)}
              </small>
              <ArrowRight size={16} />
            </button>
          ))}
          {!shown.length && <p className="muted">Tudo em dia neste grupo.</p>}
          {shown.length > 20 && (
            <small>
              Primeiras 20 demandas. Abra Tarefas para consultar todas.
            </small>
          )}
        </section>
        <section className="flow-panel">
          <p className="eyebrow">/ RELACIONAMENTO /</p>
          <h2>Da conversa à parceria.</h2>
          <p className="muted">
            Acompanhe quem chegou pelo funil, organize os próximos contatos e
            registre o fechamento.
          </p>
          <button className="btn primary" onClick={() => navigate("sales")}>
            {data.sales} aprovação(ões) ou pagamento(s) pendentes{" "}
            <ArrowRight size={16} />
          </button>
          <hr />
          <p className="muted">
            Asaas não configurado. Os recebimentos são conferidos e registrados
            manualmente pela agência.
          </p>
        </section>
      </div>
    </section>
  );
}

export function FlowClients({
  api,
  navigate,
  reload,
}: {
  api: Api;
  navigate: (view: string, workspace?: number) => void;
  reload: () => Promise<void>;
}) {
  const [clients, setClients] = useState<Client[]>([]),
    [spaces, setSpaces] = useState<any[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [active, setActive] = useState(""),
    [contract, setContract] = useState(""),
    [owner, setOwner] = useState(""),
    [sort, setSort] = useState("az"),
    [mode, setMode] = useState("cards"),
    [selected, setSelected] = useState<Client | null>(null),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api("flow-clients")
      .then((r) => {
        if (alive) {
          setClients(r.items);
          setSpaces(r.spaces);
          setError("");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);
  const filtered = clients
    .filter(
      (c) =>
        (!active || String(c.active) === active) &&
        (!contract || contractState(c.details) === contract) &&
        (!owner || c.details.owner === owner) &&
        textSearch(
          [
            c.name,
            c.contact,
            c.email,
            c.phone,
            c.details.segment,
            c.details.owner,
          ].join(" "),
        ).includes(textSearch(search)),
    )
    .sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name, "pt-BR")
        : sort === "za"
          ? b.name.localeCompare(a.name, "pt-BR")
          : Number(b.counts?.demands || 0) - Number(a.counts?.demands || 0),
    );
  const visible = filtered.slice((page - 1) * 12, page * 12);
  const card = (c: Client) => (
    <button
      key={c.workspace_id}
      className="flow-client"
      onClick={() => navigate("client", Number(c.workspace_id))}
    >
      <ClientCover client={c} small />
      <div className="flow-client-body">
        <div className="flow-heading">
          <ClientMark client={c} />
          <span className={"badge " + (c.active ? "stage-done" : "")}>
            {c.active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <h2>{c.name}</h2>
        <p>{c.details.segment || c.contact || "Perfil do cliente"}</p>
        <div className="flow-client-counts">
          <span>
            <strong>{c.counts?.projects || 0}</strong> projetos
          </span>
          <span>
            <strong>{c.counts?.demands || 0}</strong> demandas
          </span>
          <span>
            <strong>{c.counts?.approvals || 0}</strong> aprovações
          </span>
        </div>
        <small
          className={
            contractState(c.details) === "Vencido"
              ? "flow-red"
              : contractState(c.details) === "A vencer"
                ? "flow-amber"
                : ""
          }
        >
          Contrato · {contractState(c.details)}
        </small>
      </div>
    </button>
  );
  return (
    <section className="flow-page">
      <div className="flow-heading">
        <div>
          <p className="eyebrow">/ ESPAÇO DE TRABALHO /</p>
          <h1>Relacionamentos que fazem acontecer.</h1>
          <p className="muted">
            Cada cliente tem seu espaço. Você acompanha o todo.
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => setSelected(blankClient())}
        >
          <Plus size={17} /> Novo cliente
        </button>
      </div>
      <div className="crm-toolbar flow-client-controls">
        <label className="crm-search">
          <Search size={16} />
          <input
            aria-label="Buscar clientes"
            placeholder="Nome, contato, segmento ou responsável"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Situação do cliente"
          value={active}
          onChange={(e) => {
            setActive(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os clientes</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select
          aria-label="Situação do contrato"
          value={contract}
          onChange={(e) => {
            setContract(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os contratos</option>
          {[
            "Não cadastrado",
            "Rascunho",
            "Início futuro",
            "Vigente",
            "A vencer",
            "Vencido",
            "Encerrado",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Responsável pelo cliente"
          value={owner}
          onChange={(e) => {
            setOwner(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os responsáveis</option>
          {Array.from(
            new Set(clients.map((c) => c.details.owner).filter(Boolean)),
          ).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <select
          aria-label="Ordenar clientes"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="az">Nome A–Z</option>
          <option value="za">Nome Z–A</option>
          <option value="demands">Mais demandas</option>
        </select>
        <button
          className="flow-text-button"
          onClick={() => {
            setSearch("");
            setActive("");
            setContract("");
            setOwner("");
            setSort("az");
            setPage(1);
          }}
        >
          Limpar filtros
        </button>
        <div className="crm-switch">
          <button
            className={mode === "cards" ? "selected" : ""}
            onClick={() => setMode("cards")}
          >
            <LayoutGrid size={16} /> Cards
          </button>
          <button
            className={mode === "list" ? "selected" : ""}
            onClick={() => setMode("list")}
          >
            <List size={16} /> Lista
          </button>
        </div>
      </div>
      {!loading && (
        <p className="muted flow-results">
          {filtered.length} de {clients.length} clientes
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando clientes…</p>
      ) : mode === "cards" ? (
        <div className="flow-client-grid">{visible.map(card)}</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Responsável</th>
                <th>Situação</th>
                <th>Contrato</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.workspace_id}>
                  <td>
                    <button
                      className="flow-table-client"
                      onClick={() => navigate("client", Number(c.workspace_id))}
                    >
                      <ClientMark client={c} />
                      {c.name}
                    </button>
                  </td>
                  <td>
                    {c.contact}
                    <small>{c.email}</small>
                  </td>
                  <td>{c.details.owner || "—"}</td>
                  <td>{c.active ? "Ativo" : "Inativo"}</td>
                  <td>{contractState(c.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !filtered.length && (
        <div className="flow-panel">
          <h2>
            {clients.length
              ? "Nenhum cliente neste filtro."
              : "Seu próximo cliente começa aqui."}
          </h2>
          <p>
            Adicione diretamente ou conclua uma oportunidade em Aprovações e
            pagamentos. Espaços anteriores podem ser vinculados sem perder seus
            formulários e tarefas.
          </p>
        </div>
      )}
      <div className="crm-pagination">
        <button
          className="btn"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <small>
          {filtered.length} clientes · página {page}
        </small>
        <button
          className="btn"
          disabled={page * 12 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
      {selected && (
        <ClientDialog
          key={selected.workspace_id}
          initial={selected}
          spaces={spaces}
          api={api}
          navigate={navigate}
          close={() => setSelected(null)}
          saved={async () => {
            setSelected(null);
            setRefresh((n) => n + 1);
            await reload();
          }}
        />
      )}
    </section>
  );
}

export function ClientDialog({
  initial,
  spaces,
  api,
  navigate,
  close,
  saved,
  initialTab = "general",
  initialMedia,
}: {
  initial: Client;
  spaces: any[];
  api: Api;
  navigate: (v: string, w?: number) => void;
  close: () => void;
  saved: () => Promise<void>;
  initialTab?: string;
  initialMedia?: "photo" | "cover";
}) {
  const [c, setC] = useState(initial),
    [tab, setTab] = useState(initialTab),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [sales, setSales] = useState<any[]>([]);
  const set = (key: string, value: any) => {
      setDirty(true);
      setC((p) => ({ ...p, [key]: value }));
    },
    detail = (key: string, value: any) => {
      setDirty(true);
      setC((p) => ({ ...p, details: { ...p.details, [key]: value } }));
    };
  const dismiss = () => {
    if (!dirty || confirm("Descartar alterações não salvas do cliente?"))
      close();
  };
  useEffect(() => {
    let alive = true;
    if (c.workspace_id)
      api("flow-client-history", undefined, { id: c.workspace_id })
        .then((r) => {
          if (alive) setSales(r.sales);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    return () => {
      alive = false;
    };
  }, []);
  const field = (
    key: string,
    label: string,
    type = "text",
    isDetail = false,
  ) => (
    <Control label={label}>
      <input
        type={type === "url" ? "text" : type}
        value={(isDetail ? c.details[key] : (c as any)[key]) || ""}
        onChange={(e) => (isDetail ? detail : set)(key, e.target.value)}
        required={key === "name"}
        maxLength={key === "email" ? 254 : 2000}
      />
    </Control>
  );
  return (
    <Modal
      title={c.workspace_id ? c.name : "Novo cliente"}
      close={dismiss}
      busy={busy}
    >
      <div className="flow-tabs">
        {[
          ["general", "Geral"],
          ["briefing", "Briefing"],
          ["brand", "Identidade visual"],
          ["resources", "Materiais"],
          ["contract", "Contrato"],
          ...(c.workspace_id ? [["history", "Comercial"]] : []),
        ].map(([k, v]) => (
          <button
            key={k}
            className={tab === k ? "selected" : ""}
            onClick={() => setTab(k)}
          >
            {v}
          </button>
        ))}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(
              c.workspace_id ? "flow-client-save" : "flow-client-create",
              { ...c, id: c.workspace_id },
            );
            await saved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="crm-fields">
          {tab === "general" && (
            <>
              <section
                className="flow-client-media flow-full"
                aria-label="Foto e capa do cliente"
              >
                <div className="flow-client-media-row">
                  <ClientMark client={c} />
                  <div>
                    <h3>Foto do perfil</h3>
                    <p className="muted">
                      A foto ou o logotipo que identifica este cliente.
                    </p>
                    <FlowUpload
                      workspace={Number(c.workspace_id)}
                      images
                      label="Alterar foto / logo"
                      autoFocus={initialMedia === "photo"}
                      onBusy={setBusy}
                      done={(f) => detail("photo", f.url)}
                    />
                    {c.details.photo && (
                      <button
                        type="button"
                        className="flow-text-button"
                        onClick={() => detail("photo", "")}
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>
                <div className="flow-client-media-row">
                  <div className="flow-client-cover-preview">
                    <ClientCover client={c} small />
                  </div>
                  <div>
                    <h3>Imagem de capa</h3>
                    <p className="muted">
                      Uma imagem horizontal para o espaço do cliente.
                    </p>
                    <FlowUpload
                      workspace={Number(c.workspace_id)}
                      images
                      label="Alterar capa"
                      autoFocus={initialMedia === "cover"}
                      onBusy={setBusy}
                      done={(f) => detail("cover", f.url)}
                    />
                    {c.details.cover && (
                      <button
                        type="button"
                        className="flow-text-button"
                        onClick={() => detail("cover", "")}
                      >
                        Remover capa
                      </button>
                    )}
                  </div>
                </div>
                <details className="flow-media-links">
                  <summary>Usar uma imagem por link</summary>
                  {field("photo", "Link da foto / logo", "url", true)}
                  {field("cover", "Link da capa", "url", true)}
                </details>
              </section>
              {!c.workspace_id && (
                <Control label="Usar um espaço já existente (opcional)">
                  <select
                    value={c.existing_workspace || ""}
                    onChange={(e) =>
                      set("existing_workspace", Number(e.target.value))
                    }
                  >
                    <option value="">
                      Criar um novo espaço para o cliente
                    </option>
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Control>
              )}
              {field("name", "Nome da empresa / cliente *")}
              {field("contact", "Nome do contato")}
              {field("email", "E-mail", "email")}
              {field("phone", "Telefone / WhatsApp", "tel")}
              {field("document", "CPF / CNPJ")}
              {field("segment", "Segmento", "text", true)}
              {field("owner", "Responsável pelo relacionamento", "text", true)}
              <Control label="Situação">
                <select
                  value={String(c.active)}
                  onChange={(e) => set("active", e.target.value === "true")}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </Control>
              <Control label="Descrição">
                <textarea
                  value={c.details.description || ""}
                  onChange={(e) => detail("description", e.target.value)}
                  maxLength={4000}
                />
              </Control>
              <Control label="Cor do perfil">
                <input
                  type="color"
                  value={c.details.color}
                  onChange={(e) => detail("color", e.target.value)}
                />
              </Control>
            </>
          )}
          {(tab === "briefing" || tab === "brand") && (
            <Control
              label={
                tab === "briefing"
                  ? "Briefing e informações do negócio"
                  : "Diretrizes da identidade visual"
              }
            >
              <textarea
                rows={14}
                maxLength={12000}
                value={c.details[tab] || ""}
                onChange={(e) => detail(tab, e.target.value)}
              />
            </Control>
          )}
          {tab === "resources" && (
            <div className="flow-full">
              <p className="muted">
                Arquivos enviados ficam restritos à agência. Para links
                externos, configure o acesso também no serviço de origem.
              </p>
              <FlowUpload
                workspace={Number(c.workspace_id)}
                done={(f) =>
                  detail("resources", [
                    ...(c.details.resources || []),
                    { name: f.name, url: f.url, category: "documents" },
                  ])
                }
              />
              {(c.details.resources || []).map((r: any, i: number) => (
                <div className="flow-resource" key={i}>
                  <input
                    aria-label={"Nome do material " + (i + 1)}
                    placeholder="Nome do material"
                    required
                    value={r.name}
                    onChange={(e) =>
                      detail(
                        "resources",
                        c.details.resources.map((x: any, j: number) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={"Link do material " + (i + 1)}
                    placeholder="https://"
                    type="text"
                    required
                    value={r.url}
                    onChange={(e) =>
                      detail(
                        "resources",
                        c.details.resources.map((x: any, j: number) =>
                          j === i ? { ...x, url: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <select
                    aria-label="Categoria do material"
                    value={r.category}
                    onChange={(e) =>
                      detail(
                        "resources",
                        c.details.resources.map((x: any, j: number) =>
                          j === i ? { ...x, category: e.target.value } : x,
                        ),
                      )
                    }
                  >
                    <option value="documents">Documentos</option>
                    <option value="brand">Identidade visual</option>
                    <option value="briefing">Briefing</option>
                    <option value="contract">Contrato</option>
                  </select>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      Abrir
                    </a>
                  )}
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      detail(
                        "resources",
                        c.details.resources.filter(
                          (_: any, j: number) => j !== i,
                        ),
                      )
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() =>
                  detail("resources", [
                    ...(c.details.resources || []),
                    { name: "", url: "", category: "documents" },
                  ])
                }
              >
                <Plus size={16} /> Adicionar material
              </button>
            </div>
          )}
          {tab === "contract" && (
            <>
              <Control label="Registro contratual">
                <select
                  value={c.details.contract_status}
                  onChange={(e) => detail("contract_status", e.target.value)}
                >
                  <option value="none">Não cadastrado</option>
                  <option value="draft">Rascunho</option>
                  <option value="signed">Assinado (registro manual)</option>
                  <option value="closed">Encerrado</option>
                </select>
              </Control>
              {field("contract_start", "Data de início", "date", true)}
              {field("contract_end", "Data de término", "date", true)}
              <Control label="Avisar com antecedência (dias)">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={c.details.notice_days}
                  onChange={(e) =>
                    detail("notice_days", Number(e.target.value))
                  }
                />
              </Control>
              {field("contract_url", "Link do contrato · HTTPS", "url", true)}
              <FlowUpload
                workspace={Number(c.workspace_id)}
                label="Enviar contrato"
                done={(f) => detail("contract_url", f.url)}
              />
              <Control label="Observações do contrato">
                <textarea
                  value={c.details.contract_notes || ""}
                  onChange={(e) => detail("contract_notes", e.target.value)}
                />
              </Control>
              <p className="flow-full">
                Situação calculada: <strong>{contractState(c.details)}</strong>.
                Registro interno; não realiza assinatura digital.
              </p>
            </>
          )}
          {tab === "history" && (
            <div className="flow-full">
              <p className="muted">
                Histórico comercial interno da agência. A confirmação abaixo é
                manual, não bancária.
              </p>
              {!sales.length && (
                <p>Cadastro direto, sem oportunidade convertida vinculada.</p>
              )}
              {sales.map((s) => (
                <article className="flow-panel" key={s.opportunity_id}>
                  <h3>
                    {s.company || s.name} · {money(s.approved_amount)}
                  </h3>
                  <p>Origem: {s.source}</p>
                  <p>
                    Pagamento registrado em {time(s.paid_at)} ·{" "}
                    {s.payment_reference}
                  </p>
                  <p>{s.notes}</p>
                  {s.answers.map((a: any, i: number) => (
                    <p key={i}>
                      <strong>{a.label || a.key}: </strong>
                      {Array.isArray(a.value)
                        ? a.value.join(", ")
                        : String(a.value ?? "")}
                    </p>
                  ))}
                  <details>
                    <summary>Histórico do CRM</summary>
                    {s.events.map((e: any, i: number) => (
                      <p key={i}>
                        {e.message}
                        <small>{time(e.created_at)}</small>
                      </p>
                    ))}
                  </details>
                </article>
              ))}
            </div>
          )}
        </fieldset>
        <div className="flow-heading">
          {c.workspace_id > 0 && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  confirm("Descartar alterações não salvas e abrir projetos?")
                )
                  navigate("client", Number(c.workspace_id));
              }}
            >
              Projetos e demandas <ArrowRight size={16} />
            </button>
          )}
          <button className="btn primary" disabled={busy}>
            {busy ? "Salvando…" : "Salvar cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SalesControl({
  api,
  id,
  disabled = false,
  onChanged,
}: {
  api: Api;
  id: number;
  disabled?: boolean;
  onChanged?: () => void;
}) {
  const [sale, setSale] = useState<any>(undefined),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clients, setClients] = useState<Client[]>([]),
    [target, setTarget] = useState(""),
    [reference, setReference] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  async function load() {
    const [s, c] = await Promise.all([
      api("flow-sale-item", undefined, { id }),
      api("flow-clients"),
    ]);
    setSale(s.sale);
    setClients(c.items);
  }
  useEffect(() => {
    let alive = true;
    Promise.all([api("flow-sale-item", undefined, { id }), api("flow-clients")])
      .then(([s, c]) => {
        if (alive) {
          setSale(s.sale);
          setClients(c.items);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      await api(action, {
        id,
        revision: sale?.revision,
        client_id: Number(target),
        reference,
        confirmed,
      });
      await load();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flow-sale-control">
      <p className="eyebrow">/ PASSAGEM PARA CLIENTE /</p>
      <h3>Aprovação e pagamento</h3>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {sale === undefined ? (
        <p>Carregando…</p>
      ) : sale === null ? (
        <>
          <p>
            Quando o follow-up terminar, encaminhe os dados salvos da
            oportunidade para aprovação comercial.
          </p>
          <button
            type="button"
            className="btn primary"
            disabled={busy || disabled}
            onClick={() => void act("flow-sale-send")}
          >
            Encerrar follow-up e encaminhar <ArrowRight size={16} />
          </button>
        </>
      ) : sale.state === "approval" ? (
        <>
          <p>
            Confirme a aprovação comercial antes de registrar o recebimento.
            Este registro não substitui a assinatura do contrato.
          </p>
          <button
            type="button"
            className="btn primary"
            disabled={busy || disabled}
            onClick={() => void act("flow-sale-approve")}
          >
            Registrar aprovação comercial
          </button>
        </>
      ) : sale.state === "payment" ? (
        <>
          <p>
            Proposta aprovada: <strong>{money(sale.approved_amount)}</strong>
          </p>
          <p className="notice">
            Asaas não conectado. Confira o recebimento fora do Flow antes de
            confirmar.
          </p>
          <Control label="Destino do cliente">
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">
                Criar novo cliente com os dados da oportunidade
              </option>
              {clients.map((c) => (
                <option key={c.workspace_id} value={c.workspace_id}>
                  {c.name} · {c.email || c.contact}
                </option>
              ))}
            </select>
          </Control>
          <Control label="Referência do recebimento / comprovante">
            <input
              value={reference}
              maxLength={200}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex.: Pix recebido em 17/10 · referência interna"
            />
          </Control>
          <label className="flow-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            Conferi o recebimento e confirmo o vínculo com o cliente
            selecionado.
          </label>
          <div className="actions">
            <button
              type="button"
              className="btn"
              disabled={busy || disabled}
              onClick={() => void act("flow-sale-return")}
            >
              Devolver para revisão
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={busy || disabled || !confirmed || !reference.trim()}
              onClick={() => void act("flow-sale-pay")}
            >
              Confirmar recebimento e vincular cliente
            </button>
          </div>
        </>
      ) : (
        <p className="notice">
          Recebimento registrado manualmente em {time(sale.paid_at)}. Cliente
          vinculado ao painel, sem duplicar o cadastro.
        </p>
      )}
      {disabled && (
        <small>Salve as alterações da oportunidade antes de continuar.</small>
      )}
    </section>
  );
}
export function FlowSales({ api }: { api: Api }) {
  const [items, setItems] = useState<any[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api("flow-sales")
      .then((r) => {
        if (alive) setItems(r.items);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refresh]);
  return (
    <section>
      <p className="eyebrow">/ COMERCIAL /</p>
      <h1>Da proposta à parceria.</h1>
      <p className="muted">
        Encerre o follow-up no CRM para encaminhar uma oportunidade. Somente
        após aprovação e registro do recebimento ela entra como cliente.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="flow-sales-board">
        {[
          ["approval", "Aprovação comercial"],
          ["payment", "Aguardando pagamento"],
          ["paid", "Clientes vinculados"],
        ].map(([state, label]) => (
          <section key={state} className="flow-sales-column">
            <h2>
              {label}{" "}
              <small>{items.filter((i) => i.state === state).length}</small>
            </h2>
            {items
              .filter((i) => i.state === state)
              .map((i) => (
                <button
                  className="flow-sale-card"
                  key={i.opportunity_id}
                  onClick={() => setSelected(i)}
                >
                  <strong>{i.company || i.name}</strong>
                  <p>{i.name}</p>
                  <span>{money(i.approved_amount || i.amount)}</span>
                  <small>
                    {state === "paid"
                      ? "Recebimento manual registrado"
                      : "Abrir próximo passo"}{" "}
                    <ArrowRight size={14} />
                  </small>
                </button>
              ))}
          </section>
        ))}
      </div>
      {loading && <p role="status">Carregando…</p>}
      {selected && (
        <Modal
          title={selected.company || selected.name}
          close={() => setSelected(null)}
        >
          <SalesControl
            api={api}
            id={Number(selected.opportunity_id)}
            onChanged={() => setRefresh((n) => n + 1)}
          />
        </Modal>
      )}
    </section>
  );
}
export function FlowProjects({
  api,
  workspace,
  navigate,
  onCreated,
}: {
  api: Api;
  workspace: number;
  navigate: (view: string, workspace?: number, project?: number) => void;
  onCreated?: () => void;
}) {
  const [items, setItems] = useState<any[]>([]),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [creating, setCreating] = useState(false);
  const requestVersion = useRef(0);
  const saving = useRef(false);
  useEffect(() => {
    let alive = true;
    const version = ++requestVersion.current;
    api("flow-projects", undefined, { workspace })
      .then((r) => {
        if (alive && version === requestVersion.current) setItems(r.items);
      })
      .catch((e) => {
        if (alive && version === requestVersion.current) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [workspace, refresh]);
  return (
    <section>
      <div className="flow-heading">
        <h2>Projetos do cliente</h2>
        <button className="btn primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> {creating ? "Fechar criação" : "Novo projeto"}
        </button>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {creating && (
        <form
          className="flow-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving.current) return;
            saving.current = true;
            const version = ++requestVersion.current;
            setBusy(true);
            try {
              const result = await api("flow-project-create", {
                workspace,
                name,
                description,
                create_key: key,
              });
              if (version !== requestVersion.current) return;
              // The save response carries the authoritative list: no second
              // request or reload is needed to make the new project visible.
              setItems(result.items);
              setName("");
              setDescription("");
              setKey(crypto.randomUUID());
              setCreating(false);
              setError("");
              onCreated?.();
            } catch (e) {
              setError((e as Error).message);
              setRefresh((n) => n + 1);
            } finally {
              saving.current = false;
              setBusy(false);
            }
          }}
        >
          <div className="flow-two">
            <Control label="Nome do projeto">
              <input
                required
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Campanha de novembro"
              />
            </Control>
            <Control label="Descrição">
              <input
                maxLength={4000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Control>
          </div>
          <button className="btn primary" disabled={busy}>
            <Plus size={16} /> Criar projeto
          </button>
        </form>
      )}
      <div className="flow-client-grid">
        {items.map((p) => (
          <button
            className="flow-panel flow-project"
            key={p.id}
            onClick={() => navigate("tasks", workspace, Number(p.id))}
          >
            <small>/ PROJETO BD-{String(p.id).padStart(4, "0")} /</small>
            <h2>{p.name}</h2>
            <p>{p.description || "Abra para organizar as demandas."}</p>
            <p className="muted">
              {p.done || 0} de {p.tasks} entregas concluídas
            </p>
            <progress value={Number(p.done || 0)} max={Number(p.tasks) || 1} />
            {(p.preview || []).map((t: any) => (
              <div className="flow-project-preview" key={t.id}>
                <span>
                  {t.status === "done" ? "✓" : "□"} {t.title}
                </span>
                <small>{dueLabel(t.due_date)}</small>
              </div>
            ))}
            <span>
              {p.tasks} demanda(s) · Abrir projeto <ArrowRight size={16} />
            </span>
          </button>
        ))}
      </div>
      {!items.length && !error && (
        <p className="flow-empty">
          Os projetos deste cliente aparecem aqui. Crie um projeto para
          organizar as próximas entregas.
        </p>
      )}
    </section>
  );
}
