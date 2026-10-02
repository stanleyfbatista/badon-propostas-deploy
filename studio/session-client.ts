export class SessionExpiredError extends Error {
  constructor() {
    super("Sua sessão expirou. Entre novamente para continuar.");
  }
}

// The caller owns navigation. Never replay a save or upload after losing a session.
export function createSessionClient(
  fetcher: typeof fetch,
  expired: () => void,
) {
  let csrf = "";
  let remembered = false;
  let identity = "";
  async function request(url: string, init: RequestInit = {}, login = false) {
    if (
      remembered &&
      init.method === "POST" &&
      !login &&
      !url.includes("action=logout") &&
      !url.includes("action=accept")
    ) {
      const previousIdentity = identity;
      // Recover a collected PHP session BEFORE a mutation. Never retry the mutation.
      const boot = await request("/api/studio.php?action=boot", {
        signal: AbortSignal.timeout(15000),
      });
      if (!boot.user || (previousIdentity && previousIdentity !== identity)) {
        expired();
        throw new SessionExpiredError();
      }
    }
    const response = await fetcher(url, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...init.headers, "X-CSRF-Token": csrf },
    });
    const result = await response.json().catch(() => ({
      error:
        "Não foi possível concluir. Confira sua conexão e tente novamente.",
    }));
    if (
      (response.status === 401 && !login) ||
      (response.status === 403 && result.code === "csrf_expired")
    ) {
      expired();
      throw new SessionExpiredError();
    }
    if (!response.ok) throw new Error(result.error || "Falha na solicitação.");
    if (typeof result.csrf === "string") csrf = result.csrf;
    if (typeof result.remembered === "boolean") remembered = result.remembered;
    if (Object.prototype.hasOwnProperty.call(result, "user"))
      identity = result.user
        ? (result.user.agency ? "a:" : "u:") + result.user.id
        : "";
    return result;
  }
  async function api(
    action: string,
    data?: unknown,
    query: Record<string, string | number> = {},
  ) {
    const params = new URLSearchParams({
      action,
      ...Object.fromEntries(
        Object.entries(query).map(([k, v]) => [k, String(v)]),
      ),
    });
    return request(
      "/api/studio.php?" + params,
      {
        method: data === undefined ? "GET" : "POST",
        signal:
          action === "boot" || action === "logout"
            ? AbortSignal.timeout(15000)
            : undefined,
        headers:
          data === undefined ? {} : { "Content-Type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      },
      action === "login",
    );
  }
  async function logout() {
    // Refresh CSRF even if another tab rotated it or the server removed the session.
    await api("boot");
    await api("logout", {});
  }
  return { api, request, logout, getCsrf: () => csrf };
}
