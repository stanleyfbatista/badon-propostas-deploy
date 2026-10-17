import React, { useEffect, useState } from "react";
import { ArrowRight, FileText, Folder, CheckCheck } from "lucide-react";
import { Api } from "./Crm";
import { Workspace } from "./types";
import { TaskDialog } from "./Tasks";
import { todayLocal, dueLabel } from "./task-model";

export function FlowMemberHome({
  api,
  actor,
  spaces,
  workspace,
  ready,
  editable,
  navigate,
}: {
  api: Api;
  actor: string;
  spaces: Workspace[];
  workspace: number;
  ready: boolean;
  editable: boolean;
  navigate: (view: string, workspace?: number, project?: number) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!workspace || !ready) return;
    setData(null);
    setError("");
    // Both APIs enforce membership and task visibility on the server.
    // Never load the agency-private client dossier or commercial overview.
    Promise.all([
      api("task-list", undefined, { workspace, today: todayLocal(), page: 1 }),
      api("task-options", undefined, { workspace }),
    ])
      .then(([tasks, options]) => {
        if (alive) setData({ ...tasks, projects: options.projects || [] });
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [api, workspace, ready, refresh]);
  async function openTask(id: number) {
    setOpening(true);
    setError("");
    try {
      setSelected(await api("task-item", undefined, { workspace, id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOpening(false);
    }
  }
  const space = spaces.find((s) => Number(s.id) === workspace);
  const stages: Record<string, string> = {
    todo: "A fazer",
    doing: "Em andamento",
    review: "Aguardando aprovação",
    done: "Concluído",
  };
  return (
    <section className="member-home">
      <header className="member-home-heading">
        <div>
          <p className="eyebrow">/ BĀDON + VOCÊ /</p>
          <h1>Seu negócio em movimento.</h1>
          <p className="muted">
            Seus projetos, as próximas entregas e a nossa equipe mais perto de
            você.
          </p>
        </div>
        {spaces.length > 0 && (
          <label className="control">
            <span>Seu espaço</span>
            <select
              aria-label="Seu espaço"
              value={workspace}
              onChange={(e) => navigate("portal", Number(e.target.value))}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      {!space ? (
        <div className="flow-panel">
          <h2>Seu acesso está aguardando liberação.</h2>
          <p>
            Você ainda não tem um espaço disponível. Fale com a equipe Bādon
            para conferir seu convite.
          </p>
        </div>
      ) : !ready ? (
        <div className="flow-panel">
          <h2>Estamos preparando seu espaço.</h2>
          <p>
            A equipe Bādon vai avisar quando suas entregas estiverem
            disponíveis.
          </p>
        </div>
      ) : (
        <>
          <div className="member-welcome-banner">
            <div>
              <p className="eyebrow">/ {space.name} /</p>
              <h2>
                Gente de verdade,
                <br />
                perto do seu negócio.
              </h2>
              <p>Vamos acompanhar cada próximo passo juntos.</p>
            </div>
            <div className="member-team-photos">
              <img
                src="/assets/img/hero-stanley.webp"
                alt="Stanley Batista, da equipe Bādon"
              />
              <img
                src="/assets/img/guilherme-domerio.jpg"
                alt="Guilherme Domério, da equipe Bādon"
              />
            </div>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}{" "}
              <button className="btn" onClick={() => setRefresh((n) => n + 1)}>
                Tentar novamente
              </button>
            </div>
          )}
          {!data ? (
            !error && <p role="status">Carregando seu espaço…</p>
          ) : (
            <>
              <div className="member-shortcuts">
                <button
                  className="flow-panel"
                  onClick={() => navigate("tasks", workspace)}
                >
                  <CheckCheck />
                  <span>
                    <strong>Suas demandas</strong>
                    <small>
                      {Number(data.metrics.total) - Number(data.metrics.done)}{" "}
                      em aberto · {data.metrics.done} concluídas
                    </small>
                  </span>
                  <ArrowRight />
                </button>
                <button
                  className="flow-panel"
                  onClick={() => navigate("tasks", workspace)}
                >
                  <FileText />
                  <span>
                    <strong>Arquivos e referências</strong>
                    <small>
                      Abra uma demanda para ver seus anexos, links e
                      comentários.
                    </small>
                  </span>
                  <ArrowRight />
                </button>
              </div>
              <div className="member-home-grid">
                <section className="flow-panel">
                  <header className="member-section-title">
                    <h2>Seus projetos</h2>
                    <Folder size={20} />
                  </header>
                  <p className="muted">
                    Um lugar para acompanhar o que estamos construindo.
                  </p>
                  {data.projects.map((p: any) => (
                    <button
                      className="flow-row"
                      key={p.id}
                      onClick={() => navigate("tasks", workspace, Number(p.id))}
                    >
                      <Folder size={18} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>Ver demandas e materiais do projeto</small>
                      </span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                  {!data.projects.length && (
                    <p className="flow-empty">
                      Os projetos organizados pela equipe aparecerão aqui. Você
                      já pode acompanhar as demandas disponíveis.
                    </p>
                  )}
                </section>
                <section className="flow-panel">
                  <header className="member-section-title">
                    <h2>Próximas entregas</h2>
                    <button
                      className="flow-text-button"
                      onClick={() => navigate("tasks", workspace)}
                    >
                      Ver todas <ArrowRight size={16} />
                    </button>
                  </header>
                  {data.items
                    .filter((t: any) => t.status !== "done")
                    .slice(0, 5)
                    .map((t: any) => (
                      <button
                        className="flow-row"
                        key={t.id}
                        disabled={opening}
                        onClick={() => void openTask(Number(t.id))}
                      >
                        <span>
                          <strong>{t.title}</strong>
                          <small>
                            {stages[t.status]} ·{" "}
                            {t.due_date
                              ? dueLabel(t.due_date)
                              : "Prazo a combinar"}
                          </small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                    ))}
                  {!data.items.some((t: any) => t.status !== "done") && (
                    <p className="flow-empty">
                      Nenhuma entrega em aberto por aqui. As próximas demandas
                      aparecerão neste espaço.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
          {selected && (
            <TaskDialog
              key={selected.item.id}
              initial={selected}
              people={data?.people || []}
              actor={actor}
              workspace={workspace}
              api={api}
              editable={editable}
              close={() => {
                setSelected(null);
                setRefresh((n) => n + 1);
              }}
              saved={() => {
                setSelected(null);
                setRefresh((n) => n + 1);
              }}
              openChild={setSelected}
            />
          )}
        </>
      )}
    </section>
  );
}
