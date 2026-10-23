import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  FileText,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import "./flow-welcome.css";
import "./flow-portal.css";
import { PrivacyLinks } from "./PrivacyLinks";

export function FlowPreview() {
  return (
    <figure
      className="welcome-preview"
      aria-label="Exemplo ilustrativo de um quadro de demandas no Bādon Flow"
    >
      <div className="preview-browser">
        <span className="preview-dots">
          <i />
          <i />
          <i />
        </span>
        <span>app.produtorabadon.com</span>
        <span className="preview-secure">Bādon Flow</span>
      </div>
      <div className="preview-app">
        <aside className="preview-sidebar">
          <b>
            Bādon<span>.</span> <em>flow</em>
          </b>
          <small>ESPAÇO DE TRABALHO</small>
          <span>
            <LayoutDashboard /> Visão geral
          </span>
          <span>
            <Users /> Clientes
          </span>
          <span className="selected">
            <CheckCheck /> Demandas
          </span>
          <span>
            <Check /> Aprovações
          </span>
          <span>
            <CalendarDays /> Agenda
          </span>
          <div className="preview-signature">
            Gente de verdade,
            <br />
            perto do seu negócio.
          </div>
        </aside>
        <div className="preview-work">
          <div className="preview-topline">
            <span>Workspace / Demandas</span>
            <span className="preview-avatar">B</span>
          </div>
          <div className="preview-title">
            <div>
              <small>/ VAMOS FAZER ACONTECER /</small>
              <h3>Da ideia à entrega.</h3>
            </div>
            <span className="preview-add">
              <Plus size={12} /> Nova demanda
            </span>
          </div>
          <div className="preview-tools">
            <span>
              <Search size={11} /> Buscar demanda
            </span>
            <span>Todos os clientes</span>
            <span>Quadro · Lista</span>
          </div>
          <div className="preview-board">
            <section>
              <h4>
                <i /> A fazer <span>02</span>
              </h4>
              <PreviewCard
                title="Planejar a próxima campanha"
                tag="Estratégia"
              />
              <PreviewCard
                title="Organizar referências"
                tag="Identidade visual"
              />
            </section>
            <section>
              <h4>
                <i className="blue" /> Em andamento <span>01</span>
              </h4>
              <PreviewCard
                title="Criar os criativos da campanha"
                tag="Criação"
                cover
              />
              <div className="preview-subtasks">
                <Check size={12} /> Copy aprovada
                <br />
                <Circle size={10} /> Finalizar peças
              </div>
            </section>
            <section>
              <h4>
                <i className="green" /> Concluído <span>01</span>
              </h4>
              <PreviewCard title="Alinhar o briefing" tag="Planejamento" done />
              <span className="preview-new">+ Adicionar demanda</span>
            </section>
          </div>
        </div>
      </div>
      <figcaption>
        <span className="preview-live-dot" /> Do planejamento à entrega, tudo
        conectado.<small>Visualização ilustrativa</small>
      </figcaption>
    </figure>
  );
}

function PreviewCard({
  title,
  tag,
  cover = false,
  done = false,
}: {
  title: string;
  tag: string;
  cover?: boolean;
  done?: boolean;
}) {
  return (
    <div className={"preview-card" + (cover ? " with-cover" : "")}>
      {cover && (
        <div className="preview-card-cover">
          Uma ideia.
          <br />
          <strong>Novas possibilidades.</strong>
          <span>/ BĀDON /</span>
        </div>
      )}
      <div className="preview-card-body">
        <small>
          Projeto de exemplo <MoreHorizontal size={12} />
        </small>
        <strong>{title}</strong>
        <span className={"preview-tag" + (done ? " done" : "")}>
          {done ? "Concluído" : tag}
        </span>
        <footer>
          <span>
            <CalendarDays size={10} /> {done ? "Entregue" : "Esta semana"}
          </span>
          <span className="preview-avatar">{cover ? "SB" : "GD"}</span>
        </footer>
      </div>
    </div>
  );
}

export type AccessAudience = "client" | "team";
export function accessAudience(search: string): AccessAudience {
  return new URLSearchParams(search).get("acesso") === "equipe"
    ? "team"
    : "client";
}
export function accessUrl(audience: AccessAudience, login = false) {
  return (
    (login ? "/entrar" : "/") +
    "?acesso=" +
    (audience === "team" ? "equipe" : "cliente")
  );
}

export function FlowWelcome({
  children,
  initialOpen = false,
  sessionExpired = false,
  initialAudience = "client",
}: {
  children: React.ReactNode | ((audience: AccessAudience) => React.ReactNode);
  initialOpen?: boolean;
  sessionExpired?: boolean;
  initialAudience?: AccessAudience;
}) {
  const [audience, setAudience] = useState<AccessAudience>(initialAudience);
  const [loginOpen, setLoginOpen] = useState(initialOpen || sessionExpired);
  const team = audience === "team";
  const dialog = useRef<HTMLDialogElement>(null);
  const primaryLogin = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (sessionExpired) setLoginOpen(true);
  }, [sessionExpired]);
  useEffect(() => {
    if (!loginOpen) return;
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element.showModal();
    document.body.style.overflow = "hidden";
    element
      .querySelector<HTMLInputElement>(
        'input[name="email"], input[name="password"]',
      )
      ?.focus();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      const target = returnFocus.current;
      if (target?.isConnected && target !== document.body) target.focus();
      else primaryLogin.current?.focus();
    };
  }, [loginOpen]);
  function choose(next: AccessAudience) {
    setAudience(next);
    history.replaceState(null, "", accessUrl(next));
  }
  function openLogin() {
    history.replaceState(null, "", accessUrl(audience, true));
    setLoginOpen(true);
  }
  function closeLogin() {
    history.replaceState(null, "", accessUrl(audience));
    setLoginOpen(false);
  }
  return (
    <div
      className={
        "flow-welcome welcome-private " +
        (team ? "welcome-for-team" : "welcome-for-client")
      }
    >
      <a className="welcome-skip" href="#welcome-main">
        Pular para o conteúdo
      </a>
      <header className="welcome-nav">
        <a className="welcome-brand" href="/" aria-label="Bādon Flow — início">
          Bādon<span>.</span>
          <em>flow</em>
        </a>
        <nav aria-label="Escolha seu acesso">
          <button
            className={"welcome-access-choice " + (!team ? "is-active" : "")}
            aria-pressed={!team}
            onClick={() => choose("client")}
          >
            Cliente ou parceiro
          </button>
          <button
            className={"welcome-access-choice " + (team ? "is-active" : "")}
            aria-pressed={team}
            onClick={() => choose("team")}
          >
            Equipe Bādon
          </button>
        </nav>
      </header>
      <main id="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-intro">
            <p className="welcome-kicker">
              <span />{" "}
              {team
                ? "ESPAÇO DE TRABALHO · EQUIPE BĀDON"
                : "SEU ESPAÇO COM A BĀDON · CLIENTES E PARCEIROS"}
            </p>
            <h1 id="welcome-title">
              {team ? (
                <>
                  Bom trabalho
                  <br />
                  começa com <span>clareza.</span>
                </>
              ) : (
                <>
                  Seu negócio
                  <br />
                  em movimento.
                  <br />
                  <span>A gente, com você.</span>
                </>
              )}
            </h1>
            <p className="welcome-lead">
              {team ? (
                <>
                  Um time. Um lugar.
                  <br />
                  Vamos fazer acontecer.
                </>
              ) : (
                <>
                  Cada ideia, um próximo passo.
                  <br />
                  Cada entrega, uma construção juntos.
                </>
              )}
            </p>
            <p className="welcome-description">
              {team
                ? "Este é o nosso espaço de trabalho. Entre para organizar a rotina, acompanhar as demandas e cuidar de cada projeto com a proximidade da Bādon."
                : "Este espaço é seu. Acompanhe seus projetos, veja o andamento das demandas e encontre os arquivos e referências das entregas. Tudo mais perto de você."}
            </p>
            <div className="welcome-actions">
              <button
                ref={primaryLogin}
                className="welcome-primary"
                onClick={openLogin}
              >
                {team ? "Acessar espaço da equipe" : "Acessar meu espaço"}{" "}
                <ArrowUpRight size={20} />
              </button>
            </div>
            <p className="welcome-access-note">
              <CheckCheck size={16} />{" "}
              {team
                ? "Acesso exclusivo para a equipe e membros autorizados."
                : "Acesso exclusivo para clientes e parceiros convidados."}
            </p>
            <p className="welcome-access-help">
              Primeiro acesso? Use o convite enviado pela Bādon.
              <br />
              Ainda não recebeu? Fale com a pessoa que acompanha seu projeto.
            </p>
          </div>
          {team ? (
            <div className="welcome-visual">
              <div className="welcome-orbit" aria-hidden="true" />
              <FlowPreview />
              <div className="welcome-floating-note">
                <span>
                  <CheckCheck size={22} />
                </span>
                <div>
                  <strong>Da ideia à entrega, juntos.</strong>
                  <small>Nosso time, nossos próximos passos.</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="welcome-client-photo">
              <div className="welcome-portraits">
                <figure>
                  <img
                    src="/assets/img/hero-stanley.webp"
                    alt="Stanley Batista, gestor de marketing da Bādon"
                    width="900"
                    height="900"
                    fetchPriority="high"
                  />
                  <figcaption>
                    Stanley Batista<small>Gestão de marketing</small>
                  </figcaption>
                </figure>
                <figure>
                  <img
                    src="/assets/img/guilherme-domerio.jpg"
                    alt="Guilherme Domério, gestor comercial da Bādon"
                    width="1170"
                    height="1157"
                  />
                  <figcaption>
                    Guilherme Domério<small>Gestão comercial</small>
                  </figcaption>
                </figure>
              </div>
              <div className="welcome-client-signature">
                <span>/ BĀDON + VOCÊ /</span>
                <h2>
                  Gente de verdade,
                  <br />
                  perto do seu negócio.
                </h2>
                <ArrowUpRight size={28} />
              </div>
            </div>
          )}
        </section>
        <section
          className="welcome-access-details"
          aria-labelledby="access-details-title"
        >
          <div>
            <p className="welcome-kicker">/ CADA PASSO, MAIS PRÓXIMO /</p>
            <h2 id="access-details-title">
              {team
                ? "Clareza para fazer acontecer."
                : "Seu projeto tem um lugar aqui."}
            </h2>
          </div>
          <div>
            <FileText />
            <h3>{team ? "Projetos organizados" : "Seus projetos"}</h3>
            <p>
              {team
                ? "Clientes e entregas no mesmo fluxo de trabalho."
                : "Acompanhe o que estamos construindo juntos."}
            </p>
          </div>
          <div>
            <CheckCheck />
            <h3>
              {team ? "Rotina em movimento" : "Demandas e próximos passos"}
            </h3>
            <p>
              {team
                ? "Responsáveis, prioridades e prazos à vista."
                : "Veja o andamento e converse sobre cada entrega."}
            </p>
          </div>
          <div>
            <MessageSquare />
            <h3>
              {team ? "Informações conectadas" : "Arquivos e referências"}
            </h3>
            <p>
              {team
                ? "Contexto e materiais junto de cada demanda."
                : "Encontre os materiais e links dentro das demandas."}
            </p>
          </div>
        </section>
      </main>
      <footer className="welcome-footer">
        <a className="welcome-brand" href="/">
          Bādon<span>.</span>
          <em>flow</em>
        </a>
        <p>Um espaço de trabalho e relacionamento da Produtora Bādon.</p>
        <PrivacyLinks />
      </footer>
      {loginOpen && (
        <dialog
          ref={dialog}
          className="welcome-login-dialog"
          aria-labelledby="welcome-login-title"
          onCancel={(event) => {
            event.preventDefault();
            closeLogin();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const rect = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom
              )
                closeLogin();
            }
          }}
        >
          <button
            className="welcome-login-close"
            type="button"
            onClick={closeLogin}
            aria-label="Fechar login"
          >
            <X size={22} />
          </button>
          {typeof children === "function" ? children(audience) : children}
        </dialog>
      )}
    </div>
  );
}
