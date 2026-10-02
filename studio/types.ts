export type Ending = { title: string; message: string; whatsapp: boolean };
export type CoverMedia = { type: "image" | "video"; src: string };
export type Welcome = {
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  media: CoverMedia | null;
  layout: "left" | "right" | "top" | "background";
  fit: "cover" | "contain";
  x: number;
  y: number;
  alt: string;
};
export type Route = { target: string; ending?: Ending };
export type Rule = Route & { operator: string; value: string };
export type Field = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  description?: string;
  placeholder?: string;
  button_text?: string;
  rules: Rule[];
  otherwise: Route;
};
export type Theme = {
  primary: string;
  text: string;
  background: string;
  font: string;
  buttons: string;
  progress: boolean;
  image: string;
};
export type Draft = {
  layout?: Record<string, { x: number; y: number }>;
  title: string;
  slug: string;
  description: string;
  whatsapp_message: string;
  definition: {
    version: number;
    mode: string;
    fields: Field[];
    completion: Ending;
    welcome?: Partial<Welcome>;
    theme?: Theme;
  };
  settings: {
    meta_pixel?: { enabled: boolean; id: string };
    notify_emails: string[];
    webhook_url?: string;
    tracking: boolean;
    hidden_fields: string[];
    minimum_seconds: number;
  };
};
export type Form = {
  id: number;
  workspace_id: number;
  folder_id: number | null;
  draft: Draft;
  revision: number;
  published_revision: number | null;
  published_at: string | null;
  slug: string;
  active: boolean;
};
export type Workspace = {
  id: number;
  name: string;
  role: "agency" | "admin" | "editor" | "reader";
};
export type Boot = {
  csrf: string;
  user: null | { id: number; email: string; agency: boolean };
  workspaces: Workspace[];
  crm_ready?: boolean;
  profile?: Profile | null;
};
export type Profile = {
  actor: string;
  name: string;
  email: string;
  phone: string;
  appearance: "light" | "dark";
  avatar_url: string | null;
};
export const types: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  tel: "Telefone",
  url: "Website",
  address: "Endereço",
  text: "Texto curto",
  textarea: "Texto longo",
  single: "Escolha única",
  multiple: "Múltipla escolha",
  yesno: "Sim / Não",
  select: "Lista suspensa",
  number: "Número",
  date: "Data",
};
export const defaultTheme: Theme = {
  primary: "#075bc5",
  text: "#12243d",
  background: "#f5f7fb",
  font: "sans",
  buttons: "round",
  progress: true,
  image: "",
};
export const ending: Ending = {
  title: "Obrigado pelo contato.",
  message: "Recebemos suas informações. Em breve entraremos em contato.",
  whatsapp: true,
};
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
