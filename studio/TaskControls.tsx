import React, { useRef, useState, useEffect } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Flag,
  Search,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { Avatar, Person } from "./Crm";
import {
  dueLabel,
  taskPriorities,
  taskStatuses,
  todayLocal,
} from "./task-model";
import "./task-controls.css";

export function FieldPopover({
  label,
  value,
  disabled,
  children,
  tone = "",
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  disabled?: boolean;
  tone?: string;
  wide?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    panel.current?.hidePopover();
    button.current?.focus();
  };
  const place = () => {
    const el = panel.current,
      anchor = button.current;
    if (!el || !anchor) return;
    const r = anchor.getBoundingClientRect(),
      width = el.offsetWidth,
      height = el.offsetHeight;
    el.style.left =
      Math.max(12, Math.min(r.left, window.innerWidth - width - 12)) + "px";
    el.style.top =
      Math.max(
        12,
        r.bottom + height + 8 <= window.innerHeight
          ? r.bottom + 8
          : r.top - height - 8,
      ) + "px";
  };
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  return (
    <div className="flow-field">
      <button
        ref={button}
        type="button"
        className={"flow-field-trigger " + tone}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (open) close();
          else {
            panel.current?.showPopover();
            place();
            (
              panel.current?.querySelector<HTMLElement>(
                "input:not([disabled])",
              ) ||
              panel.current?.querySelector<HTMLElement>(
                '.flow-picker-option[aria-pressed="true"]',
              ) ||
              panel.current?.querySelector<HTMLElement>(
                "button:not([disabled])",
              )
            )?.focus();
          }
        }}
      >
        <span>{value}</span>
        <ChevronDown size={12} className="flow-field-chevron" />
      </button>
      <div
        ref={panel}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={"flow-field-popover" + (wide ? " wide" : "")}
        onToggle={(e) => setOpen((e as any).newState === "open")}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.stopPropagation();
          if (
            ["ArrowDown", "ArrowUp"].includes(e.key) &&
            panel.current?.querySelector(".flow-picker-option")
          ) {
            e.preventDefault();
            const options = Array.from(
              panel.current.querySelectorAll<HTMLButtonElement>(
                ".flow-picker-option:not([disabled])",
              ),
            );
            const index = options.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            options[
              (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                options.length
            ]?.focus();
          }
        }}
      >
        <header>
          <strong>{label}</strong>
          <button type="button" aria-label={"Fechar " + label} onClick={close}>
            <X size={15} />
          </button>
        </header>
        {children(close)}
      </div>
    </div>
  );
}

type Option = { value: string; label: string; person?: Person; tone?: string };
export function ChoiceField({
  label,
  value,
  options,
  onChange,
  disabled,
  searchable = false,
  icon,
  tone = "",
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  icon?: React.ReactNode;
  tone?: string;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  return (
    <FieldPopover
      label={label}
      disabled={disabled}
      tone={tone}
      value={
        <>
          {selected?.person ? <Avatar person={selected.person} /> : icon}
          <span>{selected?.label || "Não definido"}</span>
        </>
      }
    >
      {(close) => (
        <>
          {searchable && (
            <label className="flow-picker-search">
              <Search size={16} />
              <input
                aria-label={"Buscar em " + label}
                placeholder="Buscar por nome ou e-mail"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </label>
          )}
          <div className="flow-picker-options">
            {options
              .filter((o) =>
                (o.label + " " + (o.person?.email || ""))
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
              )
              .map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={"flow-picker-option " + (o.tone || "")}
                  aria-pressed={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setQuery("");
                    close();
                  }}
                >
                  {o.person && <Avatar person={o.person} />}
                  <span>
                    {o.label}
                    {o.person?.name && <small>{o.person.email}</small>}
                  </span>
                  {o.value === value && <Check size={15} />}
                </button>
              ))}
            {!options.some((o) =>
              (o.label + " " + (o.person?.email || ""))
                .toLocaleLowerCase()
                .includes(query.toLocaleLowerCase()),
            ) && <p className="muted">Nenhum resultado.</p>}
          </div>
        </>
      )}
    </FieldPopover>
  );
}
export function StatusField({
  value,
  onChange,
  disabled,
  label = "Status",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <ChoiceField
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      icon={<CircleDot size={15} />}
      tone={"flow-status-" + value}
      options={Object.entries(taskStatuses).map(([value, label]) => ({
        value,
        label,
        tone: "flow-status-" + value,
      }))}
    />
  );
}
export function PriorityField({
  value,
  onChange,
  disabled,
  label = "Prioridade",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <ChoiceField
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      icon={<Flag size={15} />}
      tone={"flow-priority-" + value}
      options={Object.entries(taskPriorities).map(([value, label]) => ({
        value,
        label,
        tone: "flow-priority-" + value,
      }))}
    />
  );
}
export function PersonField({
  value,
  people,
  onChange,
  disabled,
  label = "Responsável",
}: {
  value: string | null;
  people: Person[];
  onChange: (v: string | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <ChoiceField
      label={label}
      value={value || ""}
      onChange={(v) => onChange(v || null)}
      disabled={disabled}
      searchable
      icon={<UserRound size={15} />}
      options={[
        { value: "", label: "Sem responsável" },
        ...people.map((p) => ({
          value: p.actor,
          label: p.name || p.email,
          person: p,
        })),
      ]}
    />
  );
}
const key = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
export function calendarDays(month: string) {
  const start = new Date(month + "-01T12:00:00");
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return key(d);
  });
}
export function DateField({
  value,
  onChange,
  disabled,
  label = "Vencimento",
  min = "2000-01-01",
  max = "2100-12-31",
}: {
  value?: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  label?: string;
  min?: string;
  max?: string;
}) {
  const [month, setMonth] = useState((value || todayLocal()).slice(0, 7));
  useEffect(() => {
    setMonth((value || todayLocal()).slice(0, 7));
  }, [value]);
  const move = (n: number) => {
    const d = new Date(month + "-01T12:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(key(d).slice(0, 7));
  };
  const allowed = (d: string) => d >= min && d <= max;
  return (
    <FieldPopover
      label={label}
      disabled={disabled}
      wide
      value={
        <>
          <CalendarDays size={15} />
          <span>{value ? dueLabel(value) : "Definir data"}</span>
        </>
      }
    >
      {(close) => (
        <div className="flow-date-picker">
          <div className="flow-date-shortcuts">
            {[
              ["Hoje", 0],
              ["Amanhã", 1],
              ["Em 3 dias", 3],
              ["Em 1 semana", 7],
              ["Em 2 semanas", 14],
            ].map(([name, n]) => {
              const d = new Date(todayLocal() + "T12:00:00");
              d.setDate(d.getDate() + Number(n));
              const date = key(d);
              return (
                <button
                  type="button"
                  key={name}
                  disabled={!allowed(date)}
                  onClick={() => {
                    onChange(date);
                    close();
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div className="flow-date-calendar">
            <div className="flow-date-nav">
              <button
                type="button"
                aria-label="Mês anterior"
                disabled={month <= min.slice(0, 7)}
                onClick={() => move(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <strong>
                {new Date(month + "-01T12:00:00").toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={month >= max.slice(0, 7)}
                onClick={() => move(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flow-date-grid">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((s, i) => (
                <small key={i}>{s}</small>
              ))}
              {calendarDays(month).map((d) => (
                <button
                  type="button"
                  key={d}
                  aria-label={dueLabel(d)}
                  aria-pressed={d === value}
                  disabled={!allowed(d)}
                  className={
                    (d.slice(0, 7) !== month ? "outside " : "") +
                    (d === todayLocal() ? "today " : "") +
                    (d === value ? "selected" : "")
                  }
                  onClick={() => {
                    onChange(d);
                    close();
                  }}
                >
                  {Number(d.slice(-2))}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="flow-date-clear"
              onClick={() => {
                onChange(null);
                close();
              }}
            >
              Remover data
            </button>
          </div>
        </div>
      )}
    </FieldPopover>
  );
}
export function TagsField({
  value,
  onChange,
  disabled,
  label = "Etiquetas",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [draft, setDraft] = useState(value.join(", "));
  useEffect(() => setDraft(value.join(", ")), [value.join(",")]);
  return (
    <FieldPopover
      label={label}
      disabled={disabled}
      value={
        <>
          <Tag size={15} />
          <span>
            {value.filter(Boolean).join(", ") || "Adicionar etiquetas"}
          </span>
        </>
      }
    >
      {(close) => (
        <div className="flow-tag-editor">
          <label>
            Separe as etiquetas por vírgulas
            <input
              aria-label="Editar etiquetas"
              value={draft}
              maxLength={820}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onChange([
                    ...new Set(
                      draft
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    ),
                  ]);
                  close();
                }
              }}
            />
          </label>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onChange([
                ...new Set(
                  draft
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                ),
              ]);
              close();
            }}
          >
            Aplicar etiquetas
          </button>
        </div>
      )}
    </FieldPopover>
  );
}
