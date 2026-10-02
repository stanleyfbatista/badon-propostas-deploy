import assert from "node:assert/strict";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["studio/session-client.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
});
const module = { exports: {} };
new Function("module", "exports", compiled.outputFiles[0].text)(
  module,
  module.exports,
);
const { createSessionClient, SessionExpiredError } = module.exports;
function setup(responses) {
  const calls = [];
  let expired = 0;
  const client = createSessionClient(
    async (url, init) => {
      calls.push({ url, ...init });
      const next = responses.shift();
      assert.ok(next, "unexpected request / unsafe automatic retry");
      if (next instanceof Error) throw next;
      return new Response(JSON.stringify(next.body), {
        status: next.status || 200,
      });
    },
    () => expired++,
  );
  return { client, calls, expired: () => expired };
}
for (const user of [null, { id: 1 }]) {
  const test = setup([
    { body: { user, csrf: "fresh-token" } },
    { body: { ok: true } },
  ]);
  await test.client.logout();
  assert.equal(test.calls[0].url, "/api/studio.php?action=boot");
  assert.equal(test.calls[1].url, "/api/studio.php?action=logout");
  assert.equal(test.calls[1].headers["X-CSRF-Token"], "fresh-token");
  assert.equal(test.calls[1].method, "POST");
  assert.equal(test.calls[1].credentials, "same-origin");
  assert.equal(test.calls[0].cache, "no-store");
  assert.equal(test.expired(), 0);
}
for (const [status, code] of [
  [401, "session_expired"],
  [403, "csrf_expired"],
]) {
  const test = setup([{ status, body: { code, error: "expired" } }]);
  await assert.rejects(
    test.client.api("save", { draft: "unsaved" }),
    SessionExpiredError,
  );
  assert.equal(test.expired(), 1);
  assert.equal(test.calls.length, 1, "must not replay a mutation");
}
for (const action of ["login", "save"]) {
  const test = setup([
    { status: action === "login" ? 401 : 403, body: { error: "not allowed" } },
  ]);
  await assert.rejects(test.client.api(action, {}), /not allowed/);
  assert.equal(
    test.expired(),
    0,
    "bad password / missing permission is not expired session",
  );
}
const upload = setup([{ status: 401, body: { error: "expired" } }]);
await assert.rejects(
  upload.client.request("/api/studio-media.php", {
    method: "POST",
    body: new FormData(),
  }),
  SessionExpiredError,
);
assert.equal(upload.expired(), 1);
const offline = setup([new TypeError("offline")]);
await assert.rejects(offline.client.logout(), /offline/);
assert.equal(
  offline.calls.length,
  1,
  "do not report successful logout offline",
);
console.log(
  "OK: sessão expirada, CSRF renovado na saída, uploads, permissões, senha incorreta e falha de rede.",
);
