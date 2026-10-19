import type { Workspace } from "./types";

const views = new Set([
  "overview",
  "portal",
  "clients",
  "client",
  "tasks",
  "day",
  "approvals",
  "agenda",
  "crm",
  "forms",
  "profile",
  "settings",
  "members",
  "agency",
  "sales",
  "projects",
]);
export type PanelRoute = { view: string; workspace: number; project: number };
const id = (value: string | null) =>
  value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : 0;
export function readPanelRoute(search: string): PanelRoute {
  const p = new URLSearchParams(search);
  return {
    view: views.has(p.get("view") || "") ? p.get("view")! : "overview",
    workspace: id(p.get("workspace")),
    project: id(p.get("project")),
  };
}
export function defaultWorkspace(spaces: Workspace[], agency: boolean) {
  return Number(
    (agency ? spaces.find((s) => s.slug === "badon") : null)?.id ||
      spaces[0]?.id ||
      0,
  );
}
export function resolvePanelRoute(
  route: PanelRoute,
  spaces: Workspace[],
  agency: boolean,
): PanelRoute {
  const allowed = spaces.some((s) => Number(s.id) === route.workspace);
  const view =
    !agency &&
    [
      "overview",
      "clients",
      "client",
      "approvals",
      "sales",
      "projects",
      "agency",
    ].includes(route.view)
      ? "portal"
      : route.view;
  return {
    view:
      route.workspace && !allowed && view === "client"
        ? agency
          ? "clients"
          : "portal"
        : view,
    workspace: allowed ? route.workspace : defaultWorkspace(spaces, agency),
    project: allowed ? route.project : 0,
  };
}
export function panelUrl(route: PanelRoute) {
  const p = new URLSearchParams({
    view: views.has(route.view) ? route.view : "forms",
  });
  if (
    route.workspace &&
    [
      "client",
      "crm",
      "forms",
      "members",
      "portal",
      "projects",
      "tasks",
      "day",
      "agenda",
    ].includes(route.view)
  )
    p.set("workspace", String(route.workspace));
  if (route.project && ["client", "projects", "tasks"].includes(route.view))
    p.set("project", String(route.project));
  return "/painel?" + p;
}
