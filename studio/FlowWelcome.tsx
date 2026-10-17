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

export function FlowWelcome({
  children,
  initialOpen = false,
  sessionExpired = false,
}: {
  children: React.ReactNode;
  initialOpen?: boolean;
  sessionExpired?: boolean;
}) {
  const [loginOpen, setLoginOpen] = useState(initialOpen || sessionExpired);
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
  function openLogin() {
    history.replaceState(null, "", "/entrar");
    setLoginOpen(true);
  }
  function closeLogin() {
    history.replaceState(null, "", "/");
    setLoginOpen(false);
  }
  return (
    <div className="flow-welcome">
      <a className="welcome-skip" href="#welcome-main">
        Pular para o conteúdo
      </a>
      <header className="welcome-nav">
        <a className="welcome-brand" href="/" aria-label="Bādon Flow — início">
          Bādon<span>.</span>
          <em>flow</em>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">A plataforma</a>
          <a href="https://produtorabadon.com/">
            Conheça a Bādon <ArrowUpRight size={15} />
          </a>
          <button ref={primaryLogin} onClick={openLogin}>
            Entrar <ArrowUpRight size={16} />
          </button>
        </nav>
      </header>
      <main id="welcome-main">
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-intro">
            <p className="welcome-kicker">
              <span /> GESTÃO COM A PROXIMIDADE DA BĀDON
            </p>
            <h1 id="welcome-title">
              Seu próximo nível
              <br />
              começa com <span>clareza.</span>
            </h1>
            <p className="welcome-lead">
              Menos informação espalhada.
              <br />
              Mais espaço para fazer acontecer.
            </p>
            <p className="welcome-description">
              Clientes, projetos, campanhas e entregas em um só lugar. Um fluxo
              simples para conectar sua equipe e acompanhar cada próximo passo.
            </p>
            <div className="welcome-actions">
              <button className="welcome-primary" onClick={openLogin}>
                Entrar no Bādon Flow <ArrowUpRight size={20} />
              </button>
              <a href="#como-funciona">
                Conhecer a plataforma <ArrowDown size={16} />
              </a>
            </div>
            <div className="welcome-people">
              <div>
                <img
                  src="/assets/img/hero-stanley.webp"
                  alt="Stanley Batista"
                  width="44"
                  height="44"
                />
                <img
                  src="/assets/img/guilherme-domerio.jpg"
                  alt="Guilherme Domério"
                  width="44"
                  height="44"
                />
              </div>
              <p>
                Estratégia, criação e execução.
                <br />
                <strong>Com gente de verdade ao seu lado.</strong>
              </p>
            </div>
          </div>
          <div className="welcome-visual">
            <div className="welcome-orbit" aria-hidden="true" />
            <FlowPreview />
            <div className="welcome-floating-note">
              <span>
                <CheckCheck size={22} />
              </span>
              <div>
                <strong>Clareza para o próximo passo.</strong>
                <small>Sua equipe e seu cliente, mais próximos.</small>
              </div>
            </div>
          </div>
        </section>
        <section
          className="welcome-workflow"
          id="como-funciona"
          aria-labelledby="workflow-title"
        >
          <div>
            <p className="welcome-kicker">/ DA PRIMEIRA CONVERSA À ENTREGA /</p>
            <h2 id="workflow-title">Cada etapa encontra seu lugar.</h2>
          </div>
          <ol>
            {[
              {
                icon: FileText,
                title: "Formulários",
                text: "A conversa começa com as informações certas.",
              },
              {
                icon: MessageSquare,
                title: "CRM",
                text: "Contatos e próximos passos sempre à vista.",
              },
              {
                icon: Users,
                title: "Clientes",
                text: "Um espaço para cada relação e cada projeto.",
              },
              {
                icon: CheckCheck,
                title: "Demandas e entregas",
                text: "Responsáveis, prazos e aprovações conectados.",
              },
            ].map((step, index) => (
              <li key={step.title}>
                <span className="workflow-number">
                  0{index + 1} <step.icon size={20} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="welcome-team" aria-labelledby="welcome-team-title">
          <div className="welcome-team-copy">
            <p className="welcome-kicker">/ TECNOLOGIA QUE APROXIMA /</p>
            <h2 id="welcome-team-title">
              Gente de verdade,
              <br />
              perto do seu negócio.
            </h2>
            <p>
              Por trás de cada projeto, tem gente. O Flow é o nosso espaço para
              trocar ideias, organizar o trabalho e construir os próximos passos
              com você.
            </p>
            <a href="https://produtorabadon.com/">
              Conheça a Produtora Bādon <ArrowUpRight size={20} />
            </a>
          </div>
          <div className="welcome-portraits">
            <figure>
              <img
                src="/assets/img/hero-stanley.webp"
                alt="Stanley Batista, gestor de marketing da Bādon"
                width="900"
                height="900"
                loading="lazy"
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
                loading="lazy"
              />
              <figcaption>
                Guilherme Domério<small>Gestão comercial</small>
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
      <footer className="welcome-footer">
        <a className="welcome-brand" href="/">
          Bādon<span>.</span>
          <em>flow</em>
        </a>
        <p>Um lugar para fazer acontecer.</p>
        <a href="https://produtorabadon.com/privacidade/">
          Privacidade <ArrowUpRight size={14} />
        </a>
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
          {children}
        </dialog>
      )}
    </div>
  );
}
