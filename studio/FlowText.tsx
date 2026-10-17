import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import ReactMarkdown from "react-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  Paperclip,
  Undo2,
  Redo2,
  Code2,
} from "lucide-react";
import "./flow-text.css";

export function FlowText({ value }: { value: string }) {
  return (
    <div className="flow-copy">
      <ReactMarkdown skipHtml>{value}</ReactMarkdown>
    </div>
  );
}
export function FlowTextEditor({
  value,
  onChange,
  disabled = false,
  onAttach,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onAttach?: () => void;
}) {
  const change = useRef(onChange);
  change.current = onChange;
  const lastValue = useRef(value);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [, refresh] = useState(0);
  const editor = useEditor({
    immediatelyRender: false,
    injectCSS: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false,
        link: {
          openOnClick: false,
          autolink: false,
          protocols: ["https", "http", "mailto"],
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Markdown.configure({ markedOptions: { breaks: true } }),
    ],
    content: value,
    contentType: "markdown",
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Descrição e informações da tarefa",
        "aria-multiline": "true",
        "data-placeholder": "Contexto, briefing, copy e entregas…",
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();
      lastValue.current = markdown;
      change.current(markdown);
    },
    onTransaction: () => refresh((n) => n + 1),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && value !== lastValue.current) {
      editor.commands.setContent(value, {
        contentType: "markdown",
        emitUpdate: false,
      });
      lastValue.current = value;
    }
  }, [editor, value]);
  const button = (
    name: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
    unavailable = false,
  ) => (
    <button
      key={name}
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={active}
      disabled={disabled || !editor || unavailable}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon size={18} />
    </button>
  );
  function applyLink() {
    if (!editor) return;
    const clean = url.trim();
    if (!/^(https?:\/\/|mailto:)/i.test(clean)) {
      setLinkError("Use um link começando com https://, http:// ou mailto:.");
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: clean,
          marks: [{ type: "link", attrs: { href: clean } }],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: clean })
        .run();
    }
    setLinkOpen(false);
    setLinkError("");
  }
  return (
    <div className={"flow-rich-editor" + (disabled ? " readonly" : "")}>
      <div
        className="flow-rich-toolbar"
        role="toolbar"
        aria-label="Formatar descrição"
      >
        {button(
          "Título",
          Heading2,
          () => editor!.chain().focus().toggleHeading({ level: 2 }).run(),
          editor?.isActive("heading"),
        )}
        <span className="flow-tool-divider" />
        {button(
          "Negrito",
          Bold,
          () => editor!.chain().focus().toggleBold().run(),
          editor?.isActive("bold"),
        )}
        {button(
          "Itálico",
          Italic,
          () => editor!.chain().focus().toggleItalic().run(),
          editor?.isActive("italic"),
        )}
        {button(
          "Tachado",
          Strikethrough,
          () => editor!.chain().focus().toggleStrike().run(),
          editor?.isActive("strike"),
        )}
        <span className="flow-tool-divider" />
        {button(
          "Lista",
          List,
          () => editor!.chain().focus().toggleBulletList().run(),
          editor?.isActive("bulletList"),
        )}
        {button(
          "Lista numerada",
          ListOrdered,
          () => editor!.chain().focus().toggleOrderedList().run(),
          editor?.isActive("orderedList"),
        )}
        {button(
          "Citação",
          Quote,
          () => editor!.chain().focus().toggleBlockquote().run(),
          editor?.isActive("blockquote"),
        )}
        {button(
          "Código",
          Code2,
          () => editor!.chain().focus().toggleCode().run(),
          editor?.isActive("code"),
        )}
        <span className="flow-tool-divider" />
        {button(
          "Inserir link",
          Link2,
          () => {
            setUrl(editor!.getAttributes("link").href || "https://");
            setLinkOpen((v) => !v);
            setLinkError("");
          },
          editor?.isActive("link"),
        )}
        {editor?.isActive("link") &&
          button("Remover link", Unlink, () =>
            editor.chain().focus().unsetLink().run(),
          )}
        {onAttach && button("Anexos e referências", Paperclip, onAttach)}
        <span className="flow-tools-spacer" />
        {button(
          "Desfazer",
          Undo2,
          () => editor!.chain().focus().undo().run(),
          false,
          !editor?.can().undo(),
        )}
        {button(
          "Refazer",
          Redo2,
          () => editor!.chain().focus().redo().run(),
          false,
          !editor?.can().redo(),
        )}
      </div>
      {linkOpen && !disabled && (
        <div className="flow-rich-link">
          <input
            aria-label="Endereço do link na descrição"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <button type="button" className="btn" onClick={applyLink}>
            Aplicar link
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setLinkOpen(false)}
          >
            Cancelar
          </button>
          {linkError && <small role="alert">{linkError}</small>}
        </div>
      )}
      <EditorContent editor={editor} />
      {!editor && <FlowText value={value} />}
      <div className="flow-rich-footer">
        <span>Formate o texto com os ícones ou atalhos de teclado.</span>
        <span className={value.length > 10000 ? "error" : ""}>
          {value.length.toLocaleString("pt-BR")}/10.000
        </span>
      </div>
      {value.length > 10000 && (
        <p role="alert">
          A descrição ultrapassou o limite. Reduza o texto antes de salvar.
        </p>
      )}
    </div>
  );
}
