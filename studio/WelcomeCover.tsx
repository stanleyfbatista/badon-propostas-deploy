import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  PanelLeft,
  PanelRight,
  PanelTop,
  Layers,
  Check,
} from "lucide-react";
import type { CoverMedia, Welcome } from "./types";
import "../public/forms-assets/welcome.css";
import "./welcome-editor.css";

export const normalizeWelcome = (value?: Partial<Welcome>): Welcome => ({
  enabled: true,
  title: value?.title || "",
  message: value?.message || "",
  button_text: value?.button_text ?? "Começar",
  media: value?.media || null,
  layout: value?.layout || "left",
  fit: value?.fit || "cover",
  x: value?.x ?? 50,
  y: value?.y ?? 50,
  alt: value?.alt || "",
});

export function WelcomeCover({
  welcome,
  mobile = false,
}: {
  welcome: Welcome;
  mobile?: boolean;
}) {
  const media = welcome.media;
  return (
    <div className={`cover-container ${mobile ? "cover-mobile" : ""}`}>
      <section
        className={`welcome-cover cover-${media ? welcome.layout : "plain"} ${media?.type === "video" ? "has-video" : ""}`}
      >
        {media && (
          <div className="cover-media">
            {media.type === "image" ? (
              <img
                src={media.src}
                alt={welcome.alt}
                style={{
                  objectFit: welcome.fit,
                  objectPosition: `${welcome.x}% ${welcome.y}%`,
                }}
              />
            ) : (
              <video
                key={media.src}
                src={media.src}
                controls
                playsInline
                preload="metadata"
                aria-label={welcome.alt || "Vídeo de apresentação"}
                style={{
                  objectFit: welcome.fit,
                  objectPosition: `${welcome.x}% ${welcome.y}%`,
                }}
              />
            )}
          </div>
        )}
        <div className="cover-copy">
          <h2>{welcome.title || "Bem-vindo!"}</h2>
          {welcome.message && <p>{welcome.message}</p>}
          <button
            type="button"
            className="button cover-start"
            aria-disabled="true"
            title="Prévia: este botão não envia respostas"
          >
            {welcome.button_text || "Começar"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

const layouts = {
  left: "À esquerda",
  right: "À direita",
  top: "Acima do texto",
  background: "Como fundo",
} as const;
const layoutIcons = {
  left: PanelLeft,
  right: PanelRight,
  top: PanelTop,
  background: Layers,
};
export function WelcomeLayoutPicker({
  value,
  onChange,
}: {
  value: Welcome["layout"];
  onChange: (value: Welcome["layout"]) => void;
}) {
  return (
    <div className="cover-layout-control">
      <span id="cover-layout-label">Layout da mídia</span>
      <div
        className="cover-layout-options"
        role="group"
        aria-labelledby="cover-layout-label"
      >
        {(Object.keys(layouts) as Welcome["layout"][]).map((key) => {
          const Icon = layoutIcons[key];
          return (
            <button
              type="button"
              key={key}
              aria-pressed={value === key}
              aria-label={layouts[key]}
              title={layouts[key]}
              onClick={() => onChange(key)}
            >
              <Icon size={24} aria-hidden="true" />
              <span>{layouts[key]}</span>
            </button>
          );
        })}
      </div>
      <p className="cover-layout-caption" aria-live="polite">
        {value === "left" || value === "right"
          ? `Dividido — mídia ${value === "left" ? "à esquerda" : "à direita"}`
          : value === "top"
            ? "Mídia acima do texto"
            : "Mídia ao fundo, texto sobreposto"}
      </p>
    </div>
  );
}
export function WelcomeEditor({
  value,
  workspace,
  onChange,
  onUpload,
  onUploading,
}: {
  value?: Partial<Welcome>;
  workspace: number;
  onChange: (value: Welcome) => void;
  onUpload: (file: File) => Promise<CoverMedia>;
  onUploading: (value: boolean) => void;
}) {
  const welcome = normalizeWelcome(value);
  const [limits, setLimits] = useState<{ image: number; video: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const patch = (change: Partial<Welcome>) =>
    onChange({ ...welcome, ...change });
  useEffect(() => {
    let active = true;
    fetch(`/api/studio-media.php?workspace=${workspace}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error || "Não foi possível consultar o limite de upload.",
          );
        if (active) setLimits(data.limits);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [workspace]);
  async function upload(file?: File) {
    if (!file || uploading || !limits) return;
    setError("");
    const image = /\.(jpe?g|png|webp)$/i.test(file.name),
      video = /\.(mp4|webm)$/i.test(file.name);
    if (!image && !video) {
      setError("Escolha JPG, PNG, WebP, MP4 ou WebM.");
      return;
    }
    if (file.size > limits[image ? "image" : "video"] || !file.size) {
      setError("O arquivo está vazio ou excede o limite informado abaixo.");
      return;
    }
    setUploading(true);
    onUploading(true);
    try {
      patch({ media: await onUpload(file), x: 50, y: 50 });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
      onUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const size = (bytes: number) =>
    (bytes / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <>
      <p className="eyebrow">PRIMEIRA IMPRESSÃO</p>
      <h2>Capa do formulário</h2>
      <p className="cover-active">
        <Check size={16} aria-hidden="true" /> Capa sempre ativa
      </p>
      <p className="muted">
        O link público abre nesta capa. As perguntas começam ao clicar no botão
        abaixo da apresentação. A imagem ou o vídeo são opcionais.
      </p>
      <label className="control">
        <span>Título</span>
        <input
          value={welcome.title}
          maxLength={150}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>
      <label className="control">
        <span>Descrição</span>
        <textarea
          value={welcome.message}
          maxLength={2000}
          rows={4}
          onChange={(e) => patch({ message: e.target.value })}
        />
      </label>
      <label className="control">
        <span>Texto do botão</span>
        <input
          value={welcome.button_text}
          maxLength={60}
          onChange={(e) => patch({ button_text: e.target.value })}
        />
      </label>
      <h3>
        Imagem ou vídeo da capa <small>Opcional • somente nesta tela</small>
      </h3>
      <input
        ref={fileInput}
        className="cover-file"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
        aria-label="Selecionar imagem ou vídeo da capa"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
        }}
      />
      <button
        type="button"
        className="cover-upload"
        disabled={!limits || uploading}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!e.currentTarget.disabled) void upload(e.dataTransfer.files[0]);
        }}
      >
        <Upload size={22} />
        <strong>
          {uploading
            ? "Enviando arquivo…"
            : welcome.media
              ? "Trocar imagem ou vídeo"
              : "Clique ou arraste um arquivo"}
        </strong>
        <span>
          <ImageIcon size={15} /> JPG, PNG, WebP <Film size={15} /> MP4, WebM
        </span>
      </button>
      {limits && (
        <small className="cover-help">
          Imagens até {size(limits.image)} MB • Vídeos até {size(limits.video)}{" "}
          MB. Limites ajustados à hospedagem.
        </small>
      )}
      <small className="cover-help">
        Os arquivos de capa têm endereço público. Não envie documentos ou
        conteúdo confidencial. Vídeos com controles, sem reprodução automática;
        MP4 com H.264 é a opção indicada para maior compatibilidade.
      </small>
      {error && (
        <p className="cover-error" role="alert">
          {error}
        </p>
      )}
      {uploading && (
        <p role="status">Enviando… Aguarde antes de salvar ou sair.</p>
      )}
      {welcome.media && (
        <>
          <div className="cover-thumb">
            {welcome.media.type === "image" ? (
              <img
                src={welcome.media.src}
                alt="Mídia da capa selecionada"
                style={{
                  objectFit: welcome.fit,
                  objectPosition: `${welcome.x}% ${welcome.y}%`,
                }}
              />
            ) : (
              <video
                key={welcome.media.src}
                src={welcome.media.src}
                controls
                preload="metadata"
                playsInline
              />
            )}
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => patch({ media: null })}
          >
            <Trash2 size={14} /> Usar sem mídia
          </button>
          <label className="control">
            <span>
              {welcome.media.type === "image"
                ? "Descrição da imagem (acessibilidade)"
                : "Descrição do vídeo"}
            </span>
            <input
              value={welcome.alt}
              maxLength={250}
              onChange={(e) => patch({ alt: e.target.value })}
            />
          </label>
          <WelcomeLayoutPicker
            value={welcome.layout}
            onChange={(layout) => patch({ layout })}
          />
          <p className="cover-layout-help">
            {welcome.layout === "left" || welcome.layout === "right"
              ? "Formato sugerido: 1080 × 1600 px (vertical). No celular, a mídia fica acima do texto."
              : welcome.layout === "top"
                ? "Formato sugerido: 1600 × 900 px (horizontal), acima do título."
                : "Formato sugerido: 1920 × 1080 px. Texto sobre a mídia, com contraste escuro. No vídeo, os controles ficam livres na base."}
          </p>
          <label className="control">
            <span>Enquadramento</span>
            <select
              value={welcome.fit}
              onChange={(e) => patch({ fit: e.target.value as Welcome["fit"] })}
            >
              <option value="cover">Preencher (pode recortar)</option>
              <option value="contain">
                Mostrar inteiro (pode deixar faixas)
              </option>
            </select>
          </label>
          {(["x", "y"] as const).map((axis) => (
            <label className="control" key={axis}>
              <span>
                Ponto focal {axis === "x" ? "horizontal" : "vertical"}:{" "}
                {welcome[axis]}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={welcome[axis]}
                onChange={(e) => patch({ [axis]: Number(e.target.value) })}
              />
            </label>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() => patch({ x: 50, y: 50 })}
          >
            Centralizar enquadramento
          </button>
        </>
      )}
    </>
  );
}
