import React, { useRef } from "react";
function inline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
    .map((t, i) =>
      t.startsWith("**") && t.endsWith("**") ? (
        <strong key={i}>{t.slice(2, -2)}</strong>
      ) : t.startsWith("_") && t.endsWith("_") ? (
        <em key={i}>{t.slice(1, -1)}</em>
      ) : (
        t
      ),
    );
}
export function FlowText({ value }: { value: string }) {
  return (
    <div className="flow-copy">
      {value.split("\n").map((line, i) =>
        line.startsWith("## ") ? (
          <h3 key={i}>{inline(line.slice(3))}</h3>
        ) : line.startsWith("- ") ? (
          <div key={i} className="flow-bullet">
            • {inline(line.slice(2))}
          </div>
        ) : (
          <p key={i}>{inline(line) || " "}</p>
        ),
      )}
    </div>
  );
}
export function FlowTextEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function wrap(prefix: string, suffix = "") {
    const el = ref.current;
    if (!el) return;
    const a = el.selectionStart,
      b = el.selectionEnd;
    const selection = value.slice(a, b) || "texto";
    onChange(value.slice(0, a) + prefix + selection + suffix + value.slice(b));
    el.focus();
  }
  return (
    <div className="flow-editor">
      <div
        className="flow-text-tools"
        role="toolbar"
        aria-label="Formatar descrição"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => wrap("**", "**")}
        >
          <strong>Negrito</strong>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => wrap("_", "_")}
        >
          <em>Itálico</em>
        </button>
        <button type="button" disabled={disabled} onClick={() => wrap("\n## ")}>
          Título
        </button>
        <button type="button" disabled={disabled} onClick={() => wrap("\n- ")}>
          Lista
        </button>
      </div>
      <textarea
        ref={ref}
        aria-label="Descrição e informações da tarefa"
        rows={7}
        value={value}
        disabled={disabled}
        maxLength={10000}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Contexto, briefing, copy e entregas…"
      />
      <details>
        <summary>Prévia da formatação</summary>
        <FlowText value={value} />
      </details>
    </div>
  );
}
