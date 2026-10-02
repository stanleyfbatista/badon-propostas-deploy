import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";

export async function rememberTests({
  base,
  sql,
  run,
  php,
  cli,
  password,
  memberPassword,
  wa,
  messages,
}) {
  const emails = messages.length;
  class Browser {
    cookies = new Map();
    csrf = "";
    async req(action, data, query = {}) {
      const response = await fetch(
        base + "/api/studio.php?" + new URLSearchParams({ action, ...query }),
        {
          method: data === undefined ? "GET" : "POST",
          headers: {
            Cookie: [...this.cookies].map(([k, v]) => k + "=" + v).join("; "),
            "Content-Type": "application/json",
            "X-CSRF-Token": this.csrf,
          },
          body: data === undefined ? undefined : JSON.stringify(data),
        },
      );
      const headers = response.headers.getSetCookie();
      for (const header of headers) {
        const [name, ...value] = header.split(";")[0].split("=");
        if (/Max-Age=0/i.test(header)) this.cookies.delete(name);
        else this.cookies.set(name, value.join("="));
      }
      const body = await response.json();
      if (body.csrf) this.csrf = body.csrf;
      return { status: response.status, body, headers };
    }
  }
  const probe = new Browser();
  assert.equal((await probe.req("boot")).body.remember_available, false);
  assert.equal(
    (
      await probe.req("login", {
        email: "admin@example.invalid",
        password,
        remember: true,
      })
    ).status,
    503,
  );
  run(php, [cli, "auth:migrate"]);
  run(php, [cli, "auth:migrate"]);
  const options = JSON.parse(
    run(php, [
      "-r",
      "$config=['environment'=>'production']; require $argv[1]; echo json_encode([remember_name(),remember_options(time()+86400)]);",
      path.join(path.dirname(cli), "remember.php"),
    ]),
  );
  assert.equal(options[0], "__Host-badon_remember");
  assert.equal(options[1].secure, true);
  assert.equal(options[1].httponly, true);
  assert.equal(options[1].path, "/");
  assert.equal(options[1].samesite, "Lax");
  assert.ok(!("domain" in options[1]));
  const login = async (email, pw, remember = true) => {
    const browser = new Browser();
    await browser.req("boot");
    const result = await browser.req("login", {
      email,
      password: pw,
      remember,
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const boot = await browser.req("boot");
    assert.equal(boot.body.remembered, remember);
    return { browser, result, boot };
  };
  const ageSession = (browser) =>
    run(php, [
      "-r",
      "session_name('badon_forms_session'); session_id($argv[1]); session_start(); foreach(['last_active','login_at','studio_active','studio_login'] as $key) if(isset($_SESSION[$key])) $_SESSION[$key]=time()-90000; session_write_close();",
      browser.cookies.get("badon_forms_session"),
    ]);
  for (const [email, pw, isAgency] of [
    ["admin@example.invalid", password, true],
    ["editor@example.invalid", memberPassword, false],
  ]) {
    const { browser, result } = await login(email, pw);
    const token = browser.cookies.get("badon_forms_remember");
    assert.ok(/^[a-f0-9]{64}$/.test(token));
    const rememberHeader = result.headers.find((h) =>
      h.startsWith("badon_forms_remember="),
    );
    assert.match(rememberHeader, /HttpOnly/i);
    assert.match(rememberHeader, /SameSite=Lax/i);
    const expiry = new Date(
      rememberHeader.match(/expires=([^;]+)/i)[1],
    ).getTime();
    assert.ok(
      expiry > Date.now() + 29 * 86400000 &&
        expiry <= Date.now() + 30 * 86400000,
    );
    const hash = createHash("sha256").update(token).digest("hex");
    assert.equal(
      sql(
        "SELECT COUNT(*) FROM badon_test.bf_remember_tokens WHERE token_hash='" +
          hash +
          "'",
      ).trim(),
      "1",
    );
    assert.equal(
      sql(
        "SELECT COUNT(*) FROM badon_test.bf_remember_tokens WHERE token_hash='" +
          token +
          "'",
      ).trim(),
      "0",
    );
    const csrf = browser.csrf;
    ageSession(browser);
    assert.equal((await browser.req("boot")).body.user.agency, isAgency);
    assert.equal(
      browser.csrf,
      csrf,
      "idle renewal must preserve CSRF for an existing session",
    );
    const reopened = new Browser();
    reopened.cookies.set("badon_forms_remember", token);
    const restored = await reopened.req("boot");
    assert.equal(restored.body.user.email, email);
    assert.equal(restored.body.remembered, true);
    assert.ok(reopened.csrf !== csrf);
    assert.equal(
      (
        await reopened.req("profile-save", {
          name: "Conta lembrada",
          phone: "",
          appearance: "light",
        })
      ).status,
      200,
    );
    assert.equal((await reopened.req("logout", {})).status, 200);
    assert.ok(!reopened.cookies.has("badon_forms_remember"));
    assert.equal(
      sql(
        "SELECT COUNT(*) FROM badon_test.bf_remember_tokens WHERE token_hash='" +
          hash +
          "'",
      ).trim(),
      "0",
    );
    assert.equal(
      (await browser.req("boot")).body.user,
      null,
      "logout revokes the persistent credential and sessions that use it",
    );
    const replay = new Browser();
    replay.cookies.set("badon_forms_remember", token);
    assert.equal((await replay.req("boot")).body.user, null);
    const ordinary = (await login(email, pw, false)).browser;
    assert.ok(!ordinary.cookies.has("badon_forms_remember"));
    ageSession(ordinary);
    assert.equal(
      (await ordinary.req("boot")).body.user,
      null,
      "opt-out preserves short-session expiry",
    );
    const expired = (await login(email, pw)).browser;
    const expiredHash = createHash("sha256")
      .update(expired.cookies.get("badon_forms_remember"))
      .digest("hex");
    sql(
      "UPDATE badon_test.bf_remember_tokens SET expires_at='2000-01-01' WHERE token_hash='" +
        expiredHash +
        "'",
    );
    assert.equal((await expired.req("boot")).body.user, null);
    const forged = (await login(email, pw)).browser;
    forged.cookies.set("badon_forms_remember", randomBytes(32).toString("hex"));
    assert.equal((await forged.req("boot")).body.user, null);
    const switchOff = (await login(email, pw)).browser;
    assert.equal(
      (await switchOff.req("login", { email, password: pw, remember: false }))
        .status,
      200,
    );
    assert.ok(!switchOff.cookies.has("badon_forms_remember"));
  }
  const rememberedMember = (
    await login("editor@example.invalid", memberPassword)
  ).browser;
  const memberId = Number((await rememberedMember.req("boot")).body.user.id);
  sql(
    "DELETE FROM badon_test.bf_members WHERE user_id=" +
      memberId +
      " AND workspace_id=" +
      wa,
  );
  assert.equal(
    (await rememberedMember.req("forms", undefined, { workspace: wa })).status,
    403,
  );
  sql(
    "INSERT INTO badon_test.bf_members (workspace_id,user_id,role) VALUES (" +
      wa +
      "," +
      memberId +
      ",'editor')",
  );
  for (const [email, pw] of [
    ["admin@example.invalid", password],
    ["editor@example.invalid", memberPassword],
  ]) {
    const first = (await login(email, pw)).browser,
      second = (await login(email, pw)).browser;
    const credential = second.cookies.get("badon_forms_remember");
    assert.equal(
      (
        await first.req("profile-password", {
          current: pw,
          password: randomBytes(18).toString("hex"),
        })
      ).status,
      200,
    );
    assert.ok(!first.cookies.has("badon_forms_remember"));
    assert.ok((await first.req("boot")).body.user);
    assert.equal((await second.req("boot")).body.user, null);
    const replay = new Browser();
    replay.cookies.set("badon_forms_remember", credential);
    assert.equal((await replay.req("boot")).body.user, null);
  }
  assert.equal(messages.length, emails);
  console.log(
    "OK: permanecer conectado por 30 dias, opt-in, cookies protegidos, sessão retomada após fechamento/coleta, expiração, falsificação, saída revogada, troca de senha e permissões atuais.",
  );
}
