import React, { useState } from "react";
import { FileText, Image as ImageIcon, Link, Paperclip, X } from "lucide-react";
import { FlowUpload } from "./FlowFiles";
import { TaskItem } from "./task-model";

export type AttachedFile = { url: string; name: string; mime: string };
export function TaskAttachments({
  item,
  workspace,
  files = [],
  change,
  onBusy,
}: {
  item: TaskItem;
  workspace: number;
  files?: AttachedFile[];
  change: (extras: NonNullable<TaskItem["extras"]>) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [uploaded, setUploaded] = useState<AttachedFile[]>([]),
    [preview, setPreview] = useState(""),
    [editing, setEditing] = useState<number | null>(null),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const extras = item.extras || { tags: [], links: [], cover: "" };
  const metadata = [...files, ...uploaded];
  const image = (url: string) =>
    metadata.some((f) => f.url === url && f.mime.startsWith("image/"));
  return (
    <>
      <h3>
        <Paperclip size={18} /> Anexos e referências{" "}
        <small>{extras.links.length}</small>
      </h3>
      {extras.cover && (
        <div className="flow-current-cover">
          <img
            src={extras.cover}
            alt="Capa da tarefa"
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            className="btn"
            onClick={() => change({ ...extras, cover: "" })}
          >
            <X size={14} /> Remover capa
          </button>
        </div>
      )}
      {!!item.id ? (
        <FlowUpload
          workspace={workspace}
          task={item.id}
          label="Arraste um arquivo ou clique para anexar"
          onBusy={onBusy}
          done={(f) => {
            setUploaded((v) => [...v, f]);
            change({
              ...extras,
              links: [...extras.links, { name: f.name, url: f.url }],
            });
          }}
        />
      ) : (
        <p className="muted">Salve a tarefa para enviar anexos privados.</p>
      )}
      {preview && (
        <div className="flow-attachment-preview">
          <button type="button" className="btn" onClick={() => setPreview("")}>
            <X size={14} /> Fechar prévia
          </button>
          <img
            src={preview}
            alt="Prévia do anexo"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="flow-attachments">
        {extras.links.map((link, i) => (
          <article className="flow-attachment" key={i}>
            {image(link.url) ? (
              <button
                type="button"
                className="flow-attachment-thumb"
                aria-label={"Visualizar " + link.name}
                onClick={() => setPreview(link.url)}
              >
                <img src={link.url} alt={link.name} />
              </button>
            ) : (
              <a
                className="flow-attachment-thumb"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={"Abrir " + link.name}
              >
                {link.url.startsWith("/api/flow-file.php") ? (
                  <FileText size={34} />
                ) : (
                  <Link size={32} />
                )}
              </a>
            )}
            <div className="flow-attachment-info">
              <strong title={link.name}>{link.name}</strong>
              <div className="flow-attachment-actions">
                {image(link.url) && (
                  <button
                    type="button"
                    onClick={() =>
                      change({
                        ...extras,
                        cover: extras.cover === link.url ? "" : link.url,
                      })
                    }
                  >
                    <ImageIcon size={12} />{" "}
                    {extras.cover === link.url
                      ? "Remover capa"
                      : "Usar como capa"}
                  </button>
                )}
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  Abrir arquivo ↗
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(i);
                    setName(link.name);
                    setError("");
                  }}
                >
                  Editar nome
                </button>
                <button
                  type="button"
                  onClick={() => {
                    change({
                      ...extras,
                      cover: extras.cover === link.url ? "" : extras.cover,
                      links: extras.links.filter((_, j) => i !== j),
                    });
                    if (preview === link.url) setPreview("");
                    setEditing(null);
                  }}
                >
                  Desvincular
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing !== null && (
        <div className="flow-resource">
          <input
            aria-label="Nome do anexo"
            placeholder="Nome do material"
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (name.trim()) {
                change({
                  ...extras,
                  links: extras.links.map((link, i) =>
                    i === editing ? { ...link, name: name.trim() } : link,
                  ),
                });
                setName("");
                setError("");
                setEditing(null);
              } else {
                setError("Informe um nome para o anexo.");
              }
            }}
          >
            Aplicar nome
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setEditing(null);
              setError("");
            }}
          >
            Cancelar
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      <p className="flow-inline-notice">
        Salve a tarefa para confirmar os anexos e a capa. Desvincular não apaga
        o arquivo do armazenamento.
      </p>
    </>
  );
}
