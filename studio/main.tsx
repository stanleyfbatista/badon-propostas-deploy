import "vite/modulepreload-polyfill";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Folder,
  FileText,
  Users,
  LogOut,
  Copy,
  ExternalLink,
  Save,
  Send,
  GripVertical,
  Trash2,
  Monitor,
  Smartphone,
  Check,
  ChevronUp,
  ChevronDown,
  Settings2,
  Palette,
  Route as RouteIcon,
  Download,
  Pause,
  Play,
} from "lucide-react";
import {
  Boot,
  Workspace,
  Form as FormRecord,
  Draft,
  CoverMedia,
  Field,
  Route,
  Theme,
  types,
  defaultTheme,
  ending,
  slugify,
} from "./types";
import "./studio.css";
import { LogicCanvas } from "./LogicCanvas";
import { WelcomeEditor, WelcomeCover, normalizeWelcome } from "./WelcomeCover";

let csrf = "";
async function uploadCover(file: File, workspace: number): Promise<CoverMedia> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`/api/studio-media.php?workspace=${workspace}`, {
    method: "POST",
    headers: { "X-CSRF-Token": csrf },
    body,
  });
  const result = await response.json().catch(() => ({
    error:
      "O servidor interrompeu o upload. Confira o tamanho do arquivo e os limites do PHP no cPanel.",
  }));
  if (!response.ok)
    throw new Error(result.error || "Não foi possível enviar a mídia.");
  return result.media;
}
async function api(
  action: string,
  data?: unknown,
  query: Record<string, string | number> = {},
) {
  const response = await fetch(
    "/api/studio.php?" +
      new URLSearchParams({
        action,
        ...Object.fromEntries(
          Object.entries(query).map(([k, v]) => [k, String(v)]),
        ),
      }),
    {
      method: data === undefined ? "GET" : "POST",
      headers:
        data === undefined
          ? {}
          : { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: data === undefined ? undefined : JSON.stringify(data),
    },
  );
  const result = await response.json().catch(() => ({
    error: "Não foi possível concluir. Confira sua conexão e tente novamente.",
  }));
  if (!response.ok) throw new Error(result.error || "Falha na solicitação.");
  return result;
}
const Button = ({
  children,
  kind = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: string }) => (
  <button className={"btn " + kind} {...props}>
    {children}
  </button>
);
const Input = ({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label className="control">
    <span>{label}</span>
    <input {...props} />
  </label>
);
const Text = ({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
  <label className="control">
    <span>{label}</span>
    <textarea {...props} />
  </label>
);
function ListText({
  label,
  values,
  separator,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  separator: string;
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState(values.join(separator));
  const signature = JSON.stringify(values);
  useEffect(() => {
    if (
      JSON.stringify(
        raw
          .split(separator)
          .map((s) => s.trim())
          .filter(Boolean),
      ) !== signature
    )
      setRaw(values.join(separator));
  }, [signature]);
  return (
    <Text
      label={label}
      placeholder={placeholder}
      value={raw}
      onChange={(e) => {
        setRaw(e.target.value);
        onChange(
          e.target.value
            .split(separator)
            .map((s) => s.trim())
            .filter(Boolean),
        );
      }}
    />
  );
}
const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="toggle">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
);
const Brand = () => (
  <div className="brand">
    Bādon<span>.</span>
    <small>Forms</small>
  </div>
);
function App() {
  const [boot, setBoot] = useState<Boot | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [workspace, setWorkspace] = useState(0),
    [form, setForm] = useState<FormRecord | null>(null),
    [view, setView] = useState("forms"),
    [refresh, setRefresh] = useState(0);
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || "",
  );
  async function load() {
    const b = await api("boot");
    csrf = b.csrf;
    setBoot(b);
    setWorkspace((w) =>
      b.workspaces.some((x: Workspace) => Number(x.id) === w)
        ? w
        : Number(b.workspaces[0]?.id || 0),
    );
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
    if (token) history.replaceState(null, "", location.pathname);
  }, []);
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ws = boot?.workspaces.find((w) => Number(w.id) === workspace),
    editable = ws?.role !== "reader";
  const reload = () => setRefresh((n) => n + 1);
  async function open(id: number) {
    const r = await api("form", undefined, { id });
    setForm(r.form);
    setView("editor");
  }
  if (!boot)
    return (
      <div className="login-page">
        <Brand />
        <h1>
          {error ? "Vamos conferir a instalação" : "Preparando seu espaço…"}
        </h1>
        <p role="alert">{error}</p>
        <a href="/admin/">Voltar ao painel anterior</a>
      </div>
    );
  if (!boot.user || token)
    return (
      <div className="login-page">
        <Brand />
        <p className="eyebrow">SEU PRÓXIMO CONTATO COMEÇA AQUI</p>
        <h1>
          {token
            ? "Seu espaço está pronto para você."
            : "Boas perguntas. Novas conexões."}
        </h1>
        <p>
          {token
            ? "Confirme o acesso. Se for seu primeiro convite, defina uma senha."
            : "Entre para transformar perguntas em conversas que importam."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            task(async () => {
              await api(
                token ? "accept" : "login",
                token
                  ? { token, password: d.get("password") }
                  : { email: d.get("email"), password: d.get("password") },
              );
              setToken("");
              await load();
            });
          }}
        >
          {!token && (
            <Input
              label="E-mail"
              name="email"
              type="email"
              required
              autoComplete="username"
            />
          )}
          <Input
            label={token ? "Senha para novo cadastro (12 a 72 bytes)" : "Senha"}
            name="password"
            type="password"
            required={!token}
            autoComplete={token ? "new-password" : "current-password"}
          />
          <Button kind="primary" disabled={busy}>
            {token ? "Confirmar acesso" : "Entrar"}
            <ArrowRight size={17} />
          </Button>
          {!token && (
            <Button
              type="button"
              disabled={busy}
              onClick={(e) => {
                const d = new FormData(e.currentTarget.form!);
                task(async () => {
                  const r = await api("magic", { email: d.get("email") });
                  setNotice(r.message);
                });
              }}
            >
              Receber link de acesso por e-mail
            </Button>
          )}
        </form>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <small>Uma ferramenta da Produtora Bādon.</small>
      </div>
    );
  return (
    <div className="app">
      <header className="app-header">
        <Brand />
        <div className="workspace">
          <span>ESPAÇO DE TRABALHO</span>
          <select
            aria-label="Espaço de trabalho"
            value={workspace}
            disabled={!!form}
            onChange={(e) => {
              setWorkspace(Number(e.target.value));
              setView("forms");
            }}
          >
            {boot.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="identity">
          <span>
            {boot.user.email}
            <small>
              {boot.user.agency
                ? "Agência Bādon"
                : {
                    admin: "Administrador",
                    editor: "Editor",
                    reader: "Leitor",
                  }[ws?.role as "admin"] || "Membro"}
            </small>
          </span>
          <Button
            title="Sair"
            aria-label="Sair"
            disabled={busy}
            onClick={() =>
              task(async () => {
                if (
                  form &&
                  !confirm(
                    "Sair do editor? Alterações não salvas serão descartadas.",
                  )
                )
                  return;
                await api("logout", {});
                setForm(null);
                await load();
              })
            }
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>
      {error && (
        <div className="notice error banner" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="notice banner" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
      {form ? (
        <Editor
          key={form.id}
          initial={form}
          editable={editable}
          busy={busy}
          task={task}
          notice={setNotice}
          close={() => {
            setForm(null);
            setView("forms");
            reload();
          }}
        />
      ) : (
        <div className="workspace-body">
          <aside className="sidebar">
            <p className="eyebrow">SEU ESPAÇO</p>
            <button
              className={view === "forms" ? "selected" : ""}
              onClick={() => setView("forms")}
            >
              <FileText size={18} />
              Formulários
            </button>
            {(boot.user.agency || ws?.role === "admin") && (
              <button
                className={view === "members" ? "selected" : ""}
                onClick={() => setView("members")}
              >
                <Users size={18} />
                Equipe e acessos
              </button>
            )}
            {boot.user.agency && (
              <button
                onClick={() => setView("agency")}
                className={view === "agency" ? "selected" : ""}
              >
                <Folder size={18} />
                Clientes
              </button>
            )}
            <div className="sidebar-note">
              <span className="dot" /> Tudo no seu domínio
              <small>Formulários, respostas e conexões em um só lugar.</small>
            </div>
          </aside>
          <main className="content">
            {view === "forms" && workspace > 0 && (
              <FormList
                key={workspace + ":" + refresh}
                workspace={workspace}
                editable={editable}
                task={task}
                busy={busy}
                open={open}
                reload={reload}
              />
            )}
            {view === "members" && (
              <Members
                key={workspace + ":" + refresh}
                workspace={workspace}
                task={task}
                busy={busy}
                reload={reload}
                notice={setNotice}
              />
            )}
            {view === "agency" && (
              <section>
                <p className="eyebrow">AGÊNCIA BĀDON</p>
                <h1>Um espaço para cada cliente.</h1>
                <p className="muted">
                  Cada equipe acessa somente os seus formulários e respostas.
                </p>
                <form
                  className="box compact"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    task(async () => {
                      const r = await api("workspace-create", {
                        name: d.get("name"),
                        slug: d.get("slug"),
                      });
                      await load();
                      setWorkspace(r.id);
                      setView("forms");
                    });
                  }}
                >
                  <Input
                    label="Nome do cliente"
                    name="name"
                    required
                    maxLength={150}
                  />
                  <Input
                    label="Identificador do espaço"
                    name="slug"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    placeholder="nome-do-cliente"
                  />
                  <Button kind="primary" disabled={busy}>
                    <Plus size={16} />
                    Criar espaço
                  </Button>
                </form>
                <div className="client-grid">
                  {boot.workspaces.map((w) => (
                    <button
                      className="box client"
                      key={w.id}
                      onClick={() => {
                        setWorkspace(Number(w.id));
                        setView("forms");
                      }}
                    >
                      <Folder size={25} />
                      <strong>{w.name}</strong>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {!workspace && (
              <p>
                Você ainda não pertence a um espaço. Peça um convite à Bādon.
              </p>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
type Task = (fn: () => Promise<void>) => Promise<void>;
function FormList({
  workspace,
  editable,
  task,
  busy,
  open,
  reload,
}: {
  workspace: number;
  editable: boolean;
  task: Task;
  busy: boolean;
  open: (id: number) => Promise<void>;
  reload: () => void;
}) {
  const [data, setData] = useState<{ forms: any[]; folders: any[] } | null>(
      null,
    ),
    [folder, setFolder] = useState("all"),
    [creating, setCreating] = useState(false),
    [title, setTitle] = useState(""),
    [slug, setSlug] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    task(async () => setData(await api("forms", undefined, { workspace })));
  }, [workspace]);
  const forms =
    data?.forms.filter(
      (f) =>
        (folder === "all" || String(f.folder_id || "none") === folder) &&
        (f.draft_title || f.title).toLowerCase().includes(search.toLowerCase()),
    ) || [];
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DE PERGUNTAS A OPORTUNIDADES</p>
          <h1>
            Seus formulários
            <span className="count">{data?.forms.length || 0}</span>
          </h1>
          <p className="muted">
            Crie, publique e acompanhe cada nova conversa.
          </p>
        </div>
        {editable && (
          <Button kind="primary" onClick={() => setCreating(true)}>
            <Plus size={18} />
            Novo formulário
          </Button>
        )}
      </div>
      <div className="toolbar">
        <div className="filters">
          <Button
            kind={folder === "all" ? "active" : ""}
            onClick={() => setFolder("all")}
          >
            Todos
          </Button>
          <Button
            kind={folder === "none" ? "active" : ""}
            onClick={() => setFolder("none")}
          >
            Sem pasta
          </Button>
          {data?.folders.map((f) => (
            <Button
              key={f.id}
              kind={folder === String(f.id) ? "active" : ""}
              onClick={() => setFolder(String(f.id))}
            >
              <Folder size={14} />
              {f.name}
            </Button>
          ))}
          {editable && (
            <Button
              title="Nova pasta"
              onClick={() => {
                const name = prompt("Nome da nova pasta");
                if (name)
                  task(async () => {
                    await api("folder-create", { workspace, name });
                    reload();
                  });
              }}
            >
              <Plus size={15} />
              Pasta
            </Button>
          )}
        </div>
        <input
          aria-label="Buscar formulário"
          placeholder="Buscar formulário…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {!data ? (
        <p>Carregando formulários…</p>
      ) : (
        <div className="form-grid">
          {forms.map((f) => (
            <article className="form-card" key={f.id}>
              <div className="card-top">
                <span className="form-icon">
                  <FileText size={24} />
                </span>
                <span
                  className={
                    "badge " + (f.active && f.published_at ? "live" : "")
                  }
                >
                  {!f.published_at
                    ? "Rascunho"
                    : f.active
                      ? "Publicado"
                      : "Pausado"}
                </span>
              </div>
              <h2>{f.draft_title || f.title}</h2>
              <p className="muted">/f/{f.slug}</p>
              <div className="card-stats">
                <span>
                  <strong>{f.lead_count}</strong> respostas
                </span>
                {f.published_revision &&
                  Number(f.revision) !== Number(f.published_revision) && (
                    <span>Rascunho alterado</span>
                  )}
              </div>
              <div className="card-footer">
                <Button
                  kind="primary subtle"
                  disabled={busy}
                  onClick={() => task(() => open(Number(f.id)))}
                >
                  {editable ? "Abrir editor" : "Ver formulário"}
                  <ArrowRight size={15} />
                </Button>
                {editable && (
                  <>
                    <Button
                      title="Duplicar"
                      aria-label={"Duplicar " + f.title}
                      disabled={busy}
                      onClick={() =>
                        task(async () => {
                          const r = await api("duplicate", { id: f.id });
                          await open(r.id);
                        })
                      }
                    >
                      <Copy size={16} />
                    </Button>
                    {f.published_at && (
                      <Button
                        title={f.active ? "Pausar" : "Ativar"}
                        aria-label={f.active ? "Pausar" : "Ativar"}
                        disabled={busy}
                        onClick={() =>
                          task(async () => {
                            await api("status", {
                              id: f.id,
                              active: !Number(f.active),
                            });
                            reload();
                          })
                        }
                      >
                        {f.active ? <Pause size={16} /> : <Play size={16} />}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
          {!forms.length && (
            <div className="empty box">
              <FileText size={36} />
              <h2>Sua próxima conversa começa aqui.</h2>
              <p>
                Crie um formulário com as perguntas certas para o seu público.
              </p>
              {editable && (
                <Button kind="primary" onClick={() => setCreating(true)}>
                  Criar primeiro formulário
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {creating && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <h2 id="create-title">Uma nova conversa.</h2>
            <p className="muted">
              Comece com um nome. As perguntas vêm depois.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                task(async () => {
                  const r = await api("form-create", {
                    workspace,
                    title,
                    slug,
                  });
                  setCreating(false);
                  await open(r.id);
                });
              }}
            >
              <Input
                label="Nome do formulário"
                value={title}
                autoFocus
                required
                maxLength={150}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(slugify(e.target.value));
                }}
              />
              <Input
                label="Endereço: /f/"
                required
                value={slug}
                maxLength={100}
                onChange={(e) => setSlug(e.target.value)}
              />
              <div className="actions">
                <Button type="button" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
                <Button kind="primary" disabled={busy}>
                  Criar rascunho
                  <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
function Members({
  workspace,
  task,
  busy,
  reload,
  notice,
}: {
  workspace: number;
  task: Task;
  busy: boolean;
  reload: () => void;
  notice: (s: string) => void;
}) {
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    task(async () =>
      setMembers((await api("members", undefined, { workspace })).members),
    );
  }, [workspace]);
  return (
    <section>
      <p className="eyebrow">ACESSO COM RESPONSABILIDADE</p>
      <h1>Sua equipe, no lugar certo.</h1>
      <p className="muted">
        Administradores gerenciam a equipe; editores criam e publicam; leitores
        consultam e exportam respostas.
      </p>
      <form
        className="box invite"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          task(async () => {
            await api("invite", {
              workspace,
              email: d.get("email"),
              role: d.get("role"),
            });
            notice("Convite enviado. Ele vale por 48 horas.");
          });
        }}
      >
        <Input
          label="E-mail do novo membro"
          type="email"
          required
          name="email"
        />
        <label className="control">
          <span>Permissão</span>
          <select name="role">
            <option value="reader">Leitor</option>
            <option value="editor">Editor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <Button kind="primary" disabled={busy}>
          <Send size={16} />
          Enviar convite
        </Button>
      </form>
      <div className="box">
        <p className="muted">
          A Bādon mantém acesso de agência a todos os espaços.
        </p>
        {members.map((m) => (
          <div className="member" key={m.id}>
            <strong>{m.email}</strong>
            <span>
              {
                { admin: "Administrador", editor: "Editor", reader: "Leitor" }[
                  m.role as "admin"
                ]
              }
            </span>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirm("Remover acesso de " + m.email + "?"))
                  task(async () => {
                    await api("member-remove", { workspace, id: m.id });
                    reload();
                  });
              }}
            >
              Remover acesso
            </Button>
          </div>
        ))}
        {!members.length && (
          <p>Nenhum membro de cliente aceitou um convite ainda.</p>
        )}
      </div>
    </section>
  );
}
function Editor({
  initial,
  editable,
  busy,
  task,
  notice,
  close,
}: {
  initial: FormRecord;
  editable: boolean;
  busy: boolean;
  task: Task;
  notice: (s: string) => void;
  close: () => void;
}) {
  const [form, setForm] = useState(initial),
    [draft, setDraft] = useState<Draft>(initial.draft),
    [saved, setSaved] = useState(JSON.stringify(initial.draft)),
    [selected, setSelected] = useState(
      initial.draft.definition.fields[0]?.key || "welcome",
    ),
    [tab, setTab] = useState("content"),
    [mobile, setMobile] = useState(false),
    [adding, setAdding] = useState(false),
    [uploading, setUploading] = useState(false),
    [folder, setFolder] = useState(Number(initial.folder_id || 0)),
    [savedFolder, setSavedFolder] = useState(Number(initial.folder_id || 0)),
    [folders, setFolders] = useState<any[]>([]),
    [drag, setDrag] = useState("");
  const dirty = JSON.stringify(draft) !== saved || folder !== savedFolder,
    fields = draft.definition.fields,
    field = fields.find((f) => f.key === selected),
    theme = { ...defaultTheme, ...draft.definition.theme };
  useEffect(() => {
    const stop = (e: BeforeUnloadEvent) => {
      if (dirty || uploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", stop);
    return () => removeEventListener("beforeunload", stop);
  }, [dirty, uploading]);
  useEffect(() => {
    task(async () =>
      setFolders(
        (await api("forms", undefined, { workspace: initial.workspace_id }))
          .folders,
      ),
    );
  }, []);
  const change = (patch: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const definition = (patch: Partial<Draft["definition"]>) =>
    setDraft((d) => ({ ...d, definition: { ...d.definition, ...patch } }));
  const changeField = (patch: Partial<Field>) =>
    definition({
      fields: fields.map((f) => (f.key === selected ? { ...f, ...patch } : f)),
    });
  function move(key: string, offset: number) {
    const a = [...fields],
      i = a.findIndex((f) => f.key === key),
      j = i + offset;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    definition({ fields: a });
  }
  function add(type: string) {
    const key = "p_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    definition({
      fields: [
        ...fields,
        {
          key,
          label: types[type] === "Nome" ? "Qual é o seu nome?" : "Sua pergunta",
          type,
          required: true,
          options: ["single", "multiple", "select"].includes(type)
            ? ["Primeira opção", "Segunda opção"]
            : type === "yesno"
              ? ["Sim", "Não"]
              : [],
          rules: [],
          otherwise: { target: "next" },
          description: "",
          placeholder: "",
          button_text: "Continuar",
        },
      ],
    });
    setSelected(key);
    setAdding(false);
    setTab("content");
  }
  async function save() {
    await api("save", {
      id: form.id,
      revision: form.revision,
      draft,
      folder_id: folder,
    });
    const r = await api("form", undefined, { id: form.id });
    setForm(r.form);
    setDraft(r.form.draft);
    setSaved(JSON.stringify(r.form.draft));
    setSavedFolder(folder);
    notice("Rascunho salvo. A versão pública não foi alterada.");
  }
  async function publish() {
    if (dirty) throw new Error("Salve o rascunho antes de publicar.");
    await api("publish", { id: form.id, revision: form.revision });
    const r = await api("form", undefined, { id: form.id });
    setForm(r.form);
    notice("Publicado! O link já recebe a nova versão.");
  }
  return (
    <main className="editor">
      <div className="editor-heading">
        <div className="editor-title">
          <Button
            aria-label="Voltar aos formulários"
            disabled={uploading}
            onClick={() => {
              if (!dirty || confirm("Descartar as alterações não salvas?"))
                close();
            }}
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1>{draft.title}</h1>
            <small>
              {dirty
                ? "Alterações não salvas"
                : form.published_at
                  ? "Versão publicada preservada"
                  : "Ainda não publicado"}{" "}
              · {fields.length} perguntas
            </small>
          </div>
        </div>
        <div className="actions">
          {form.published_at && (
            <a
              className="btn"
              href={"/f/" + form.slug}
              target="_blank"
              rel="noopener"
            >
              <ExternalLink size={15} />
              Abrir link
            </a>
          )}
          {editable && (
            <>
              <Button
                disabled={busy || uploading || !dirty}
                onClick={() => task(save)}
              >
                <Save size={16} />
                Salvar rascunho
              </Button>
              <Button
                kind="primary"
                disabled={busy || uploading || dirty}
                onClick={() => task(publish)}
              >
                <Send size={16} />
                Publicar
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="editor-tabs">
        {[
          ["content", "Conteúdo", FileText],
          ["logic", "Lógica", RouteIcon],
          ["theme", "Tema", Palette],
          ["settings", "Configurações", Settings2],
          ["responses", "Respostas", Users],
        ].map(([key, label, Icon]) => (
          <button
            key={String(key)}
            className={tab === key ? "selected" : ""}
            onClick={() => setTab(String(key))}
          >
            {React.createElement(Icon as typeof FileText, { size: 16 })}
            {String(label)}
          </button>
        ))}
        <span className="draft-note">
          <span className="dot" />
          Rascunho separado da publicação
        </span>
      </div>
      {tab === "responses" ? (
        <Responses id={form.id} task={task} editable={editable} />
      ) : tab === "settings" ? (
        <section className="settings-grid">
          <fieldset disabled={!editable || busy} className="box">
            <h2>Detalhes do formulário</h2>
            <Input
              label="Nome"
              value={draft.title}
              maxLength={150}
              onChange={(e) => change({ title: e.target.value })}
            />
            <Input
              label="Slug do link público"
              value={draft.slug}
              onChange={(e) => change({ slug: e.target.value })}
            />
            <Text
              label="Descrição interna"
              value={draft.description}
              onChange={(e) => change({ description: e.target.value })}
            />
            <label className="control">
              <span>Pasta</span>
              <select
                value={folder}
                onChange={(e) => setFolder(Number(e.target.value))}
              >
                <option value={0}>Sem pasta</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <Text
              label="Mensagem de WhatsApp após envio"
              placeholder="Oi, sou @nome e preenchi o formulário."
              value={draft.whatsapp_message}
              onChange={(e) => change({ whatsapp_message: e.target.value })}
            />
            <small>
              Use @identificador para inserir respostas. O botão só aparece após
              o envio e o consentimento.
            </small>
          </fieldset>
          <fieldset disabled={!editable || busy} className="box">
            <h2>Destino e origem das respostas</h2>
            <ListText
              label="E-mails para notificar (separados por vírgula)"
              values={draft.settings.notify_emails}
              separator=","
              onChange={(values) =>
                change({
                  settings: {
                    ...draft.settings,
                    notify_emails: values,
                  },
                })
              }
            />
            <small>Vazio: usa o destinatário padrão da Bādon.</small>
            <Input
              label="Webhook HTTPS (opcional)"
              type="url"
              value={draft.settings.webhook_url || ""}
              onChange={(e) =>
                change({
                  settings: { ...draft.settings, webhook_url: e.target.value },
                })
              }
            />
            <small>
              Envia as respostas para este endereço. Use somente um destino
              autorizado a receber dados pessoais.
            </small>
            <Toggle
              label="Capturar UTMs, gclid, fbclid e origem"
              checked={!!draft.settings.tracking}
              onChange={(tracking) =>
                change({ settings: { ...draft.settings, tracking } })
              }
            />
            <ListText
              label="Parâmetros personalizados da URL (um por linha)"
              placeholder={"vendedor\ncampanha"}
              values={draft.settings.hidden_fields}
              separator={"\n"}
              onChange={(values) =>
                change({
                  settings: {
                    ...draft.settings,
                    hidden_fields: values,
                  },
                })
              }
            />
            <Input
              label="Tempo mínimo antes de enviar (3 a 60 segundos)"
              type="number"
              min={3}
              max={60}
              value={draft.settings.minimum_seconds || 3}
              onChange={(e) =>
                change({
                  settings: {
                    ...draft.settings,
                    minimum_seconds: Number(e.target.value),
                  },
                })
              }
            />
            <p className="muted">Honeypot e limite por IP permanecem ativos.</p>
          </fieldset>
        </section>
      ) : (
        <div className="editor-grid">
          <aside className="blocks">
            <div className="block-heading">
              <p className="eyebrow">SEU FORMULÁRIO</p>
              <span>{fields.length}/100</span>
            </div>
            <button
              className={"block " + (selected === "welcome" ? "selected" : "")}
              onClick={() => setSelected("welcome")}
            >
              <span>↗</span>
              <div>
                Boas-vindas<small>Tela inicial opcional</small>
              </div>
            </button>
            <div className="block-divider">PERGUNTAS</div>
            {fields.map((f, i) => (
              <div
                key={f.key}
                className={
                  "block-row " + (selected === f.key ? "selected" : "")
                }
                draggable={editable}
                onDragStart={() => setDrag(f.key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag !== f.key) {
                    const a = fields.filter((x) => x.key !== drag),
                      item = fields.find((x) => x.key === drag);
                    if (item) {
                      a.splice(i, 0, item);
                      definition({ fields: a });
                    }
                  }
                }}
              >
                <button className="block" onClick={() => setSelected(f.key)}>
                  <span>{i + 1}</span>
                  <div>
                    {f.label}
                    <small>{types[f.type] || f.type}</small>
                  </div>
                  <GripVertical size={14} />
                </button>
              </div>
            ))}
            {editable && (
              <Button
                kind="add-block"
                disabled={fields.length >= 100}
                onClick={() => setAdding(true)}
              >
                <Plus size={17} />
                Adicionar pergunta
              </Button>
            )}
            <div className="block-divider">ENCERRAMENTO</div>
            <button
              className={"block " + (selected === "ending" ? "selected" : "")}
              onClick={() => setSelected("ending")}
            >
              <span>
                <Check size={15} />
              </span>
              <div>
                Obrigado<small>Após confirmar envio</small>
              </div>
            </button>
            <p className="block-tip">
              Arraste para reorganizar ou use as setas nas propriedades.
            </p>
          </aside>
          {tab === "logic" ? (
            <LogicCanvas
              draft={draft}
              selected={selected}
              editable={editable && !busy}
              onSelect={setSelected}
              onFields={(fields) => definition({ fields })}
              onLayout={(layout) => change({ layout })}
            />
          ) : (
            <section className="preview-area">
              <div className="preview-toolbar">
                <span>PRÉ-VISUALIZAÇÃO DO BLOCO</span>
                <div>
                  <button
                    aria-label="Prévia desktop"
                    className={!mobile ? "selected" : ""}
                    onClick={() => setMobile(false)}
                  >
                    <Monitor size={18} />
                  </button>
                  <button
                    aria-label="Prévia celular"
                    className={mobile ? "selected" : ""}
                    onClick={() => setMobile(true)}
                  >
                    <Smartphone size={18} />
                  </button>
                </div>
              </div>
              <div className={"preview-frame " + (mobile ? "mobile" : "")}>
                <div className="browser-bar">
                  <i />
                  <i />
                  <i />
                  <span>produtorabadon.com/f/{draft.slug}</span>
                </div>
                <Preview
                  field={field}
                  selected={selected}
                  draft={draft}
                  theme={theme}
                  mobile={mobile}
                />
              </div>
              <p className="preview-caption">
                Esta prévia não envia respostas. Publique para testar o percurso
                completo.
              </p>
            </section>
          )}
          <fieldset
            className="properties"
            disabled={!editable || busy || uploading}
          >
            {tab === "theme" ? (
              <>
                <p className="eyebrow">IDENTIDADE</p>
                <h2>Seu formulário, seu estilo.</h2>
                {(["primary", "text", "background"] as const).map((k) => (
                  <Input
                    key={k}
                    label={
                      {
                        primary: "Cor principal",
                        text: "Cor do texto",
                        background: "Cor do fundo",
                      }[k]
                    }
                    type="color"
                    value={theme[k]}
                    onChange={(e) =>
                      definition({ theme: { ...theme, [k]: e.target.value } })
                    }
                  />
                ))}
                <label className="control">
                  <span>Fonte</span>
                  <select
                    value={theme.font}
                    onChange={(e) =>
                      definition({ theme: { ...theme, font: e.target.value } })
                    }
                  >
                    <option value="sans">Sem serifa</option>
                    <option value="serif">Serifada</option>
                    <option value="mono">Monoespaçada</option>
                  </select>
                </label>
                <label className="control">
                  <span>Estilo dos botões</span>
                  <select
                    value={theme.buttons}
                    onChange={(e) =>
                      definition({
                        theme: { ...theme, buttons: e.target.value },
                      })
                    }
                  >
                    <option value="round">Arredondado</option>
                    <option value="pill">Pílula</option>
                    <option value="square">Quadrado</option>
                  </select>
                </label>
                <Input
                  label="Imagem de fundo (caminho no site)"
                  placeholder="/forms-media/fundo.webp"
                  value={theme.image}
                  onChange={(e) =>
                    definition({ theme: { ...theme, image: e.target.value } })
                  }
                />
                <small>
                  Envie uma imagem pelo gerenciador do cPanel para
                  /public_html/forms-media/ e informe o caminho aqui.
                </small>
                <Toggle
                  label="Exibir progresso"
                  checked={theme.progress}
                  onChange={(progress) =>
                    definition({ theme: { ...theme, progress } })
                  }
                />
              </>
            ) : tab === "logic" && field ? (
              <>
                <p className="eyebrow">SE A RESPOSTA FOR…</p>
                <h2>Direcione a conversa.</h2>
                <strong>{field.label}</strong>
                <p className="muted">
                  A primeira condição atendida define o próximo passo. Os saltos
                  vão somente para perguntas posteriores.
                </p>
                {field.rules.map((r, i) => (
                  <div className="rule" key={i}>
                    <div className="property-heading">
                      <h3>Condição {i + 1}</h3>
                      <div>
                        <button
                          type="button"
                          aria-label="Priorizar condição"
                          disabled={i === 0}
                          onClick={() => {
                            const rules = [...field.rules];
                            [rules[i - 1], rules[i]] = [rules[i], rules[i - 1]];
                            changeField({ rules });
                          }}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label="Mover condição para baixo"
                          disabled={i === field.rules.length - 1}
                          onClick={() => {
                            const rules = [...field.rules];
                            [rules[i + 1], rules[i]] = [rules[i], rules[i + 1]];
                            changeField({ rules });
                          }}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>
                    <select
                      aria-label="Comparação"
                      value={r.operator}
                      onChange={(e) =>
                        changeField({
                          rules: field.rules.map((x, j) =>
                            j === i ? { ...x, operator: e.target.value } : x,
                          ),
                        })
                      }
                    >
                      {Object.entries(
                        field.type === "number"
                          ? {
                              eq: "Igual a",
                              ne: "Diferente de",
                              lt: "Menor que",
                              lte: "Menor ou igual",
                              gt: "Maior que",
                              gte: "Maior ou igual",
                            }
                          : { eq: "Igual a", ne: "Diferente de" },
                      ).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {field.options.length > 0 ? (
                      <label className="control">
                        <span>Resposta</span>
                        <select
                          value={r.value}
                          onChange={(e) =>
                            changeField({
                              rules: field.rules.map((x, j) =>
                                j === i ? { ...x, value: e.target.value } : x,
                              ),
                            })
                          }
                        >
                          <option value="">Escolha uma resposta</option>
                          {field.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <Input
                        label="Resposta"
                        value={r.value}
                        onChange={(e) =>
                          changeField({
                            rules: field.rules.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    )}
                    <RouteEditor
                      route={r}
                      fields={fields.slice(fields.indexOf(field) + 1)}
                      onChange={(route) =>
                        changeField({
                          rules: field.rules.map((x, j) =>
                            j === i ? { ...x, ...route } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      onClick={() =>
                        changeField({
                          rules: field.rules.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                      Remover condição
                    </Button>
                  </div>
                ))}
                <Button
                  disabled={
                    field.type === "multiple" || field.rules.length >= 20
                  }
                  onClick={() =>
                    changeField({
                      rules: [
                        ...field.rules,
                        {
                          operator: "eq",
                          value: field.options[0] || "",
                          target: "next",
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} />
                  Adicionar condição
                </Button>
                {field.type === "multiple" && (
                  <p className="muted">
                    Múltipla escolha segue um único próximo passo. Para
                    ramificar por resposta, use Escolha única, Lista suspensa ou
                    Sim / Não.
                  </p>
                )}
                <h3>Se nenhuma condição for atendida</h3>
                <RouteEditor
                  route={field.otherwise}
                  fields={fields.slice(fields.indexOf(field) + 1)}
                  onChange={(otherwise) => changeField({ otherwise })}
                />
              </>
            ) : tab === "logic" ? (
              selected === "ending" ? (
                <>
                  <p className="eyebrow">FINAL PADRÃO</p>
                  <h2>Encerramento do funil</h2>
                  <p className="muted">
                    As saídas conectadas ao final padrão usam esta mensagem após
                    confirmar o envio. Cada condição também pode ter um
                    encerramento personalizado.
                  </p>
                  <EndingEditor
                    value={draft.definition.completion}
                    onChange={(completion) => definition({ completion })}
                  />
                </>
              ) : (
                <>
                  <p className="eyebrow">MAPA DO FUNIL</p>
                  <h2>Escolha uma pergunta.</h2>
                  <p className="muted">
                    Clique em um bloco do mapa ou na lista à esquerda para criar
                    regras do tipo “se a resposta for…”.
                  </p>
                  <p className="muted">
                    Direcione cada resposta para uma pergunta posterior, o final
                    padrão ou um encerramento personalizado. Para mudar o texto
                    de boas-vindas, use a aba Conteúdo.
                  </p>
                </>
              )
            ) : selected === "welcome" ? (
              <WelcomeEditor
                value={draft.definition.welcome}
                workspace={initial.workspace_id}
                onChange={(welcome) => definition({ welcome })}
                onUpload={(file) => uploadCover(file, initial.workspace_id)}
                onUploading={setUploading}
              />
            ) : selected === "ending" ? (
              <>
                <p className="eyebrow">CONVERSA INICIADA</p>
                <h2>Tela de agradecimento</h2>
                <EndingEditor
                  value={draft.definition.completion}
                  onChange={(completion) => definition({ completion })}
                />
              </>
            ) : field ? (
              <>
                <div className="property-heading">
                  <p className="eyebrow">PROPRIEDADES</p>
                  <div>
                    <Button
                      title="Mover para cima"
                      onClick={() => move(field.key, -1)}
                    >
                      <ChevronUp size={16} />
                    </Button>
                    <Button
                      title="Mover para baixo"
                      onClick={() => move(field.key, 1)}
                    >
                      <ChevronDown size={16} />
                    </Button>
                  </div>
                </div>
                <Text
                  label="Pergunta"
                  maxLength={240}
                  value={field.label}
                  onChange={(e) => changeField({ label: e.target.value })}
                />
                <small>
                  Insira respostas anteriores usando @identificador.
                </small>
                {fields.indexOf(field) > 0 && (
                  <label className="control">
                    <span>Inserir resposta anterior no título</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          changeField({
                            label: field.label + " @" + e.target.value,
                          });
                      }}
                    >
                      <option value="">Escolha uma pergunta…</option>
                      {fields.slice(0, fields.indexOf(field)).map((f) => (
                        <option value={f.key} key={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Input
                  label="Identificador da resposta"
                  value={field.key}
                  readOnly
                />
                <label className="control">
                  <span>Tipo de resposta</span>
                  <select
                    value={field.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      changeField({
                        type,
                        rules: [],
                        options:
                          type === "yesno"
                            ? ["Sim", "Não"]
                            : ["single", "multiple", "select"].includes(type)
                              ? field.options.length
                                ? field.options
                                : ["Primeira opção", "Segunda opção"]
                              : [],
                      });
                    }}
                  >
                    {Object.entries(types).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <Text
                  label="Descrição (opcional)"
                  value={field.description || ""}
                  onChange={(e) => changeField({ description: e.target.value })}
                />
                <Input
                  label="Placeholder"
                  value={field.placeholder || ""}
                  onChange={(e) => changeField({ placeholder: e.target.value })}
                />
                {["single", "multiple", "select"].includes(field.type) && (
                  <Text
                    label="Opções (uma por linha)"
                    rows={6}
                    value={field.options.join("\n")}
                    onChange={(e) =>
                      changeField({ options: e.target.value.split("\n") })
                    }
                  />
                )}
                <Toggle
                  label="Resposta obrigatória"
                  checked={field.required}
                  onChange={(required) => changeField({ required })}
                />
                <Input
                  label="Texto do botão"
                  maxLength={60}
                  value={field.button_text || ""}
                  placeholder="Continuar"
                  onChange={(e) => changeField({ button_text: e.target.value })}
                />
                <div className="actions">
                  <Button
                    onClick={() => {
                      const copy = {
                        ...structuredClone(field),
                        key:
                          "p_" +
                          crypto.randomUUID().replaceAll("-", "").slice(0, 12),
                        rules: [],
                        otherwise: { target: "next" },
                      };
                      definition({ fields: [...fields, copy] });
                      setSelected(copy.key);
                    }}
                  >
                    <Copy size={15} />
                    Duplicar
                  </Button>
                  <Button
                    kind="danger"
                    onClick={() => {
                      if (
                        confirm(
                          "Remover esta pergunta? Confira as condições que apontam para ela antes de salvar.",
                        )
                      ) {
                        definition({
                          fields: fields.filter((f) => f.key !== field.key),
                        });
                        setSelected("welcome");
                      }
                    }}
                  >
                    <Trash2 size={15} />
                    Excluir
                  </Button>
                </div>
              </>
            ) : (
              <p>Selecione uma pergunta.</p>
            )}
          </fieldset>
        </div>
      )}
      {adding && (
        <div className="modal-backdrop">
          <section
            className="modal block-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
          >
            <h2 id="add-title">O que você quer perguntar?</h2>
            <div className="type-grid">
              {Object.entries(types).map(([key, label]) => (
                <button key={key} onClick={() => add(key)}>
                  <Plus size={16} />
                  {label}
                </button>
              ))}
            </div>
            <Button onClick={() => setAdding(false)}>Cancelar</Button>
          </section>
        </div>
      )}
    </main>
  );
}
function EndingEditor({
  value,
  onChange,
}: {
  value: typeof ending;
  onChange: (e: typeof ending) => void;
}) {
  return (
    <>
      <Input
        label="Título"
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
      />
      <Text
        label="Mensagem"
        value={value.message}
        onChange={(e) => onChange({ ...value, message: e.target.value })}
      />
      <Toggle
        label="Exibir botão de WhatsApp após envio"
        checked={value.whatsapp}
        onChange={(whatsapp) => onChange({ ...value, whatsapp })}
      />
    </>
  );
}
function RouteEditor({
  route,
  fields,
  onChange,
}: {
  route: Route;
  fields: Field[];
  onChange: (r: Route) => void;
}) {
  return (
    <>
      <label className="control">
        <span>Ir para</span>
        <select
          value={route.target}
          onChange={(e) =>
            onChange({
              target: e.target.value,
              ...(e.target.value === "finish"
                ? { ending: route.ending || { ...ending, whatsapp: false } }
                : {}),
            })
          }
        >
          <option value="next">Próxima pergunta</option>
          <option value="end:default">Final padrão</option>
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
          <option value="finish">Encerrar formulário</option>
        </select>
      </label>
      {route.target === "finish" && (
        <EndingEditor
          value={route.ending || ending}
          onChange={(ending) => onChange({ ...route, ending })}
        />
      )}
    </>
  );
}
function Preview({
  field,
  selected,
  draft,
  theme,
  mobile,
}: {
  field?: Field;
  selected: string;
  draft: Draft;
  theme: Theme;
  mobile: boolean;
}) {
  if (selected === "welcome")
    return (
      <div
        className="cover-preview"
        style={
          {
            backgroundColor: theme.background,
            color: theme.text,
            fontFamily:
              theme.font === "serif"
                ? "Georgia, serif"
                : theme.font === "mono"
                  ? "monospace"
                  : "Arial, sans-serif",
            backgroundImage: theme.image ? `url(${theme.image})` : undefined,
            "--blue": theme.primary,
            "--cover-radius":
              theme.buttons === "pill"
                ? "100px"
                : theme.buttons === "square"
                  ? "0px"
                  : "12px",
          } as React.CSSProperties
        }
      >
        <WelcomeCover
          welcome={normalizeWelcome(draft.definition.welcome)}
          mobile={mobile}
        />
      </div>
    );
  const title =
      field?.label ||
      (selected === "welcome"
        ? draft.definition.welcome?.title || "Vamos conversar?"
        : draft.definition.completion.title),
    description =
      field?.description ||
      (selected === "welcome"
        ? draft.definition.welcome?.message ||
          "Conheça quem está do outro lado."
        : draft.definition.completion.message);
  // React atualiza propriedades individuais de estilo; nenhum HTML do usuário é interpretado.
  return (
    <div
      className="preview-content"
      style={{
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily:
          theme.font === "serif"
            ? "Georgia, serif"
            : theme.font === "mono"
              ? "monospace"
              : "Arial, sans-serif",
        backgroundImage: theme.image ? `url(${theme.image})` : undefined,
      }}
    >
      {theme.progress && (
        <div className="preview-progress">
          <span style={{ background: theme.primary }} />
        </div>
      )}
      <div>
        <span className="preview-step">
          {field
            ? String(draft.definition.fields.indexOf(field) + 1).padStart(
                2,
                "0",
              ) + " →"
            : "BĀDON FORMS"}
        </span>
        <h2>
          {title}
          {field?.required ? " *" : ""}
        </h2>
        <p>{description}</p>
        {field &&
          (["single", "multiple", "yesno"].includes(field.type) ? (
            <div className="preview-options">
              {field.options.map((o, i) => (
                <div key={i}>
                  <kbd>{String.fromCharCode(65 + i)}</kbd>
                  {o}
                </div>
              ))}
            </div>
          ) : field.type === "select" ? (
            <div className="preview-input">Selecione uma opção ↓</div>
          ) : (
            <div className="preview-input">
              {field.placeholder || "Sua resposta aqui…"}
            </div>
          ))}
        <span
          className="preview-button"
          style={{
            background: theme.primary,
            borderRadius:
              theme.buttons === "pill"
                ? 100
                : theme.buttons === "square"
                  ? 0
                  : 10,
          }}
        >
          {field?.button_text ||
            (selected === "ending" ? "Enviado com sucesso" : "Continuar")}
          <ArrowRight size={16} />
        </span>
        <small>
          {selected === "ending"
            ? "O WhatsApp só aparece após um envio real."
            : "Pressione Enter ↵"}
        </small>
      </div>
    </div>
  );
}
function Responses({
  id,
  task,
  editable,
}: {
  id: number;
  task: Task;
  editable: boolean;
}) {
  const [data, setData] = useState<{ leads: any[]; total: number }>({
      leads: [],
      total: 0,
    }),
    [page, setPage] = useState(1),
    [lead, setLead] = useState<any>(null);
  useEffect(() => {
    task(async () => setData(await api("leads", undefined, { id, page })));
  }, [id, page]);
  const refresh = () =>
    task(async () => setData(await api("leads", undefined, { id, page })));
  return (
    <section className="responses">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CADA RESPOSTA IMPORTA</p>
          <h2>{data.total} contatos recebidos</h2>
        </div>
        <form action={"/api/studio.php?action=export"} method="post">
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="id" value={id} />
          <Button>
            <Download size={16} />
            Exportar CSV
          </Button>
        </form>
      </div>
      <p className="muted">
        Os contatos já estão salvos. As notificações são processadas
        separadamente pela tarefa agendada da hospedagem.{" "}
        <Button onClick={refresh}>Atualizar status</Button>
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Contato</th>
              <th>Recebido em</th>
              <th>Notificação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.leads.map((l) => (
              <tr key={l.id}>
                <td>{l.reply_email || "Contato #" + l.id}</td>
                <td>
                  {new Date(
                    l.created_at.replace(" ", "T") + "Z",
                  ).toLocaleString("pt-BR")}
                </td>
                <td>
                  {l.notification_stale
                    ? "Interrompida"
                    : {
                        sent: "Enviada",
                        pending: "Na fila",
                        failed: "Falhou",
                        sending: "Enviando",
                      }[l.email_status as "sent"]}
                  {editable && l.can_retry && (
                    <Button
                      onClick={() => {
                        if (
                          !confirm(
                            "Recolocar a notificação na fila? Confira a caixa de entrada antes: se o servidor aceitou o e-mail mas não respondeu, a nova tentativa pode duplicar a mensagem.",
                          )
                        )
                          return;
                        task(async () => {
                          await api("retry-mail", { id, lead_id: l.id });
                          setData(await api("leads", undefined, { id, page }));
                        });
                      }}
                    >
                      Tentar novamente
                    </Button>
                  )}
                </td>
                <td>
                  <Button onClick={() => setLead(l)}>
                    Ver respostas
                    <ArrowRight size={15} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.leads.length && (
          <div className="empty">
            <h3>Ainda sem respostas.</h3>
            <p>Compartilhe o link publicado para começar.</p>
          </div>
        )}
      </div>
      <div className="actions">
        <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Anterior
        </Button>
        <span>Página {page}</span>
        <Button
          disabled={page * 30 >= data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>
      {lead && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Respostas do contato"
          >
            <h2>Contato #{lead.id}</h2>
            <dl>
              {JSON.parse(lead.values_json).map((v: any) => (
                <div className="answer" key={v.key}>
                  <dt>{v.label}</dt>
                  <dd>{v.value || "Não informado"}</dd>
                </div>
              ))}
            </dl>
            <p className="muted">
              Consentimento registrado: {lead.consent_text}
            </p>
            <Button onClick={() => setLead(null)}>Fechar</Button>
          </section>
        </div>
      )}
    </section>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
