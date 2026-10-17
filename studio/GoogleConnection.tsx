import React, { useEffect, useState } from "react";
import { CalendarDays, Link2, RefreshCw, ShieldCheck } from "lucide-react";

type GoogleState = {
  available: boolean;
  email: string | null;
  login_connected: boolean;
  calendar_connected: boolean;
  last_sync: string | null;
  sync_error: string | null;
};
type Api = (action: string, data?: any, query?: any) => Promise<any>;

export function GoogleConnection({
  api,
  compact = false,
}: {
  api: Api;
  compact?: boolean;
}) {
  const [state, setState] = useState<GoogleState | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = async () => setState(await api("google-status"));
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function act(action: string) {
    if (busy) return;
    if (
      action === "google-disconnect" &&
      !confirm(
        "Desconectar o Google? O login por e-mail continua funcionando. A sincronização para, mas a agenda e os eventos já exportados permanecem no Google; remova-os lá se não quiser mais os lembretes.",
      )
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(action, {});
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      await load();
      setNotice(
        action === "google-disconnect"
          ? "Conexão removida. Seu acesso por e-mail continua disponível."
          : "Sincronização conferida. As alterações podem levar alguns instantes para aparecer no celular.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={
        compact ? "google-connection compact" : "flow-panel google-connection"
      }
      aria-label="Conexão Google"
    >
      <div className="google-connection-heading">
        <CalendarDays size={24} />
        <h2>Google Agenda{!compact && " e acesso"}</h2>
      </div>
      {!state && !error && <p className="muted">Conferindo sua conexão…</p>}
      {state && !state.available && (
        <p className="muted">
          A integração está sendo preparada. A exportação manual de calendário
          continua disponível nas demandas.
        </p>
      )}
      {state?.available && (
        <>
          <p className="muted">
            {state.email ? (
              <>
                Conta vinculada: <strong>{state.email}</strong>.
              </>
            ) : (
              "Conecte sua conta para levar suas demandas ao celular."
            )}
          </p>
          {!compact && (
            <div className="google-connection-block">
              <h3>
                <ShieldCheck size={18} /> Entrar com Google
              </h3>
              <p>
                Vincula o Google ao seu acesso atual, sem criar contas nem mudar
                permissões. Primeiro entre no Flow com senha ou link por e-mail.
              </p>
              <button
                className="btn"
                disabled={busy || state.login_connected}
                onClick={() => void act("google-link")}
              >
                <Link2 size={16} />
                {state.login_connected
                  ? "Login Google vinculado"
                  : "Vincular login Google"}
              </button>
            </div>
          )}
          <div className="google-connection-block">
            <h3>Suas demandas, na sua agenda</h3>
            <p>
              Uma agenda separada chamada <strong>Bādon Flow</strong>.
              Sincroniza somente demandas atribuídas a você, com prazo e ainda
              não concluídas, nos espaços a que você tem acesso.
            </p>
            <p className="muted">
              Prazos aparecem às 9h (Brasília), com lembretes no vencimento e 1
              dia antes. Não são horários de reunião. Alterações de prazo e
              remoções são feitas pelo Flow; nenhuma agenda pessoal é importada.
            </p>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void act("google-calendar")}
            >
              <CalendarDays size={16} />
              {state.calendar_connected
                ? "Renovar autorização da agenda"
                : "Conectar Google Agenda"}
            </button>
            {state.calendar_connected && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => void act("google-sync")}
              >
                <RefreshCw size={16} />
                {busy ? "Processando…" : "Sincronizar agora"}
              </button>
            )}
            {state.last_sync && (
              <p className="muted">
                Última sincronização:{" "}
                {new Date(
                  state.last_sync.replace(" ", "T") + "Z",
                ).toLocaleString("pt-BR")}
                .
              </p>
            )}
            {state.sync_error && (
              <p role="status" className="notice">
                {state.sync_error === "pending"
                  ? "Há alterações na fila; serão processadas na próxima sincronização."
                  : state.sync_error === "reconnect"
                    ? "A autorização expirou ou foi revogada. Renove a conexão acima."
                    : state.sync_error === "calendar_setup"
                      ? "A criação da agenda precisa de conferência pela Bādon antes de continuar, para evitar duplicação."
                      : "A sincronização está com uma pendência. Tente sincronizar novamente."}
              </p>
            )}
            <p className="muted">
              Atualização automática a cada 5 minutos. No celular, ative esta
              agenda e as notificações no Google Agenda. Nesta fase de testes do
              Google, a autorização pode precisar ser renovada após 7 dias.
            </p>
          </div>
          {!compact && state.email && (
            <button
              className="btn"
              disabled={busy}
              onClick={() => void act("google-disconnect")}
            >
              Desconectar Google
            </button>
          )}
        </>
      )}
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
    </section>
  );
}
