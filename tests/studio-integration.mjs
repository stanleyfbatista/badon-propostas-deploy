import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mediaTests } from "./media-integration.mjs";
const publicDefinition = (html) =>
  JSON.parse(
    html
      .match(/data-definition="([^"]+)"/)[1]
      .replaceAll("&quot;", '"')
      .replaceAll("&#039;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&"),
  );

export async function studioTests({
  base,
  sql,
  run,
  php,
  cli,
  messages,
  recipients,
  Client,
  token,
  worker,
  setRejectMail,
}) {
  const before = sql("SELECT id,fields_json FROM badon_test.forms ORDER BY id");
  run(php, [cli, "studio:migrate"]);
  run(php, [cli, "studio:migrate"]);
  assert.equal(
    sql("SELECT id,fields_json FROM badon_test.forms ORDER BY id"),
    before,
  );
  assert.equal(
    sql("SELECT COUNT(*) FROM badon_test.bf_forms").trim(),
    sql("SELECT COUNT(*) FROM badon_test.forms").trim(),
  );
  sql("DELETE FROM badon_test.rate_limits");
  const password = randomBytes(18).toString("hex");
  run(php, [cli, "admin:password", "admin@example.invalid"], {
    input: password + "\n",
    stdio: ["pipe", "pipe", "ignore"],
  });
  class Api {
    cookie = "";
    csrf = "";
    async req(action, data, query = {}) {
      const r = await fetch(
        base + "/api/studio.php?" + new URLSearchParams({ action, ...query }),
        {
          method: data === undefined ? "GET" : "POST",
          redirect: "manual",
          headers: {
            Cookie: this.cookie,
            ...(data === undefined
              ? {}
              : {
                  "Content-Type": "application/json",
                  "X-CSRF-Token": this.csrf,
                }),
          },
          body: data === undefined ? undefined : JSON.stringify(data),
        },
      );
      if (r.headers.get("set-cookie"))
        this.cookie = r.headers.get("set-cookie").split(";")[0];
      const text = await r.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      if (body.csrf) this.csrf = body.csrf;
      return { status: r.status, body, headers: r.headers };
    }
  }
  const agency = new Api();
  await agency.req("boot");
  assert.equal(
    (await agency.req("login", { email: "admin@example.invalid", password }))
      .status,
    200,
  );
  const boot = await agency.req("boot");
  assert.equal(boot.body.user.agency, true);
  const badon = Number(boot.body.workspaces[0].id);
  const logoutClient = new Api();
  await logoutClient.req("boot");
  assert.equal(
    (
      await logoutClient.req("login", {
        email: "admin@example.invalid",
        password,
      })
    ).status,
    200,
  );
  const staleLogout = await logoutClient.req("logout", {});
  assert.equal(staleLogout.status, 403);
  assert.equal(staleLogout.body.code, "csrf_expired");
  await logoutClient.req("boot");
  assert.equal((await logoutClient.req("logout", {})).status, 200);
  assert.equal((await logoutClient.req("boot")).body.user, null);
  // Logout remains POST + CSRF protected but succeeds for an expired session too.
  assert.equal((await logoutClient.req("logout")).status, 405);
  logoutClient.cookie = "";
  assert.equal((await logoutClient.req("logout", {})).status, 403);
  await logoutClient.req("boot");
  assert.equal((await logoutClient.req("logout", {})).status, 200);
  const unauthorized = await logoutClient.req("forms", undefined, {
    workspace: badon,
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.body.code, "session_expired");
  const a = await agency.req("workspace-create", {
      name: "Cliente A",
      slug: "cliente-a",
    }),
    b = await agency.req("workspace-create", {
      name: "Cliente B",
      slug: "cliente-b",
    });
  const wa = a.body.id,
    wb = b.body.id;
  assert.ok(wa && wb);
  const invite = async (email, role, workspace) => {
    const response = await agency.req("invite", { email, role, workspace });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.delivery, "accepted");
    const raw = messages.at(-1).match(/#token=([a-f0-9]{64})/)[1];
    assert.ok(response.body.invite_url.endsWith("#token=" + raw));
    assert.ok(response.body.invite_url.startsWith(base + "/entrar#token="));
    const user = new Api();
    await user.req("boot");
    assert.equal(
      (
        await user.req("accept", {
          token: raw,
          password: randomBytes(18).toString("hex"),
        })
      ).status,
      200,
    );
    assert.equal((await user.req("accept", { token: raw })).status, 403); // token CSRF anterior à rotação
    await user.req("boot");
    assert.equal((await user.req("accept", { token: raw })).status, 422);
    return user;
  };
  const editor = await invite("editor@example.invalid", "editor", wa),
    reader = await invite("reader@example.invalid", "reader", wa),
    other = await invite("other@example.invalid", "admin", wb);
  // SMTP recusado não destrói o convite; somente o administrador recebe o link.
  const pendingEmail = "pending@example.invalid";
  let failedInvite;
  setRejectMail(true);
  try {
    failedInvite = await agency.req("invite", {
      workspace: wa,
      email: pendingEmail,
      role: "admin",
    });
  } finally {
    setRejectMail(false);
  }
  assert.equal(failedInvite.status, 202);
  assert.equal(failedInvite.body.delivery, "failed");
  const failedToken = failedInvite.body.invite_url.split("#token=")[1];
  assert.match(failedToken, /^[a-f0-9]{64}$/);
  const pending = (await agency.req("members", undefined, { workspace: wa }))
    .body.invites;
  assert.deepEqual(
    pending.map((i) => [i.email, i.role, i.expired]),
    [[pendingEmail, "admin", false]],
  );
  assert.ok(!JSON.stringify(pending).includes(failedToken));
  assert.ok(
    !sql("SELECT token_hash FROM badon_test.bf_tokens").includes(failedToken),
  );
  for (const client of [editor, reader, other]) {
    assert.equal(
      (await client.req("members", undefined, { workspace: wa })).status,
      403,
    );
    assert.equal(
      (
        await client.req("invite-cancel", {
          workspace: wa,
          email: pendingEmail,
        })
      ).status,
      403,
    );
  }
  const resent = await agency.req("invite", {
    workspace: wa,
    email: pendingEmail,
    role: "admin",
  });
  assert.equal(resent.status, 200);
  assert.equal(resent.body.delivery, "accepted");
  const newToken = resent.body.invite_url.split("#token=")[1];
  assert.notEqual(newToken, failedToken);
  assert.equal(
    (await agency.req("members", undefined, { workspace: wa })).body.invites
      .length,
    1,
  );
  const invited = new Api();
  await invited.req("boot");
  assert.equal(
    (await invited.req("accept", { token: failedToken, password })).status,
    422,
  );
  assert.equal(
    (await invited.req("accept", { token: newToken, password })).status,
    200,
  );
  await invited.req("boot");
  assert.equal(
    (await invited.req("members", undefined, { workspace: wa })).status,
    200,
  );
  assert.equal(
    (await invited.req("members", undefined, { workspace: wb })).status,
    403,
  );
  assert.equal(
    (await agency.req("members", undefined, { workspace: wa })).body.invites
      .length,
    0,
  );
  const cancelEmail = "cancel@example.invalid";
  const cancelInvite = await agency.req("invite", {
    workspace: wa,
    email: cancelEmail,
    role: "reader",
  });
  sql(
    "UPDATE badon_test.bf_tokens SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE email = 'cancel@example.invalid'",
  );
  assert.equal(
    (await agency.req("members", undefined, { workspace: wa })).body.invites[0]
      .expired,
    true,
  );
  assert.equal(
    (await agency.req("invite-cancel", { workspace: wa, email: cancelEmail }))
      .status,
    200,
  );
  assert.equal(
    (
      await invited.req("accept", {
        token: cancelInvite.body.invite_url.split("#token=")[1],
        password,
      })
    ).status,
    422,
  );
  assert.equal(
    (await agency.req("members", undefined, { workspace: wa })).body.invites
      .length,
    0,
  );
  console.log(
    "OK: convite com falha SMTP preservado, status explícito, reenvio, aceite, cancelamento e isolamento de permissões.",
  );
  assert.equal(
    (await editor.req("forms", undefined, { workspace: wb })).status,
    403,
  );
  assert.equal(
    (
      await editor.req("invite", {
        workspace: wa,
        email: "elevated@example.invalid",
        role: "admin",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await reader.req("form-create", {
        workspace: wa,
        title: "Proibido",
        slug: "proibido",
      })
    ).status,
    403,
  );
  assert.equal(
    (await other.req("workspace-create", { name: "Falso", slug: "falso" }))
      .status,
    403,
  );
  const legacy = new Client();
  legacy.cookie = editor.cookie;
  assert.ok(
    (await legacy.req("/admin/?view=leads")).body.includes('type="password"'),
  );
  const created = await editor.req("form-create", {
    workspace: wa,
    title: "Contato cliente A",
    slug: "cliente-a-form",
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.id;
  assert.equal((await other.req("form", undefined, { id })).status, 403);
  assert.equal((await other.req("leads", undefined, { id })).status, 403);
  assert.equal((await other.req("export", { id })).status, 403);
  assert.equal((await other.req("duplicate", { id })).status, 403);
  const f = (await editor.req("form", undefined, { id })).body.form;
  assert.equal(
    (await editor.req("publish", { id, revision: f.revision })).status,
    422,
  );
  const guest = new Client();
  assert.equal((await guest.req("/f/cliente-a-form")).status, 404);
  const draft = f.draft;
  const media = await mediaTests({
    base,
    editor,
    reader,
    other,
    wa,
    wb,
    cli,
    run,
  });
  draft.definition.welcome = {
    enabled: true,
    title: "Conheça a Bādon",
    message: "Sua próxima etapa.",
    button_text: "Vamos conversar",
    media: media.image,
    layout: "right",
    fit: "contain",
    x: 25,
    y: 75,
    alt: "Retrato do responsável",
  };
  draft.definition.fields = [
    {
      key: "nome",
      label: "Qual é seu nome?",
      type: "name",
      required: true,
      options: [],
      rules: [],
      otherwise: { target: "next" },
      button_text: "Próximo",
    },
    {
      key: "email",
      label: "Seu e-mail, @nome?",
      type: "email",
      required: true,
      options: [],
      rules: [],
      otherwise: { target: "next" },
    },
    {
      key: "interesses",
      label: "O que interessa?",
      type: "multiple",
      required: true,
      options: ["Site", "Tráfego", "Menos de R$ 1.000,00"],
      rules: [
        {
          operator: "contains",
          value: "Menos de R$ 1.000,00",
          target: "finish",
          ending: {
            title: "Obrigado pelo interesse",
            message:
              "Neste momento não temos um projeto para esse investimento.",
            whatsapp: false,
          },
        },
      ],
      otherwise: { target: "next" },
    },
    {
      key: "data",
      label: "Qual data?",
      type: "date",
      required: true,
      options: [],
      rules: [],
      otherwise: { target: "next" },
    },
  ];
  draft.whatsapp_message = "Oi, sou @nome";
  draft.definition.fields[0].rules = [
    { operator: "eq", value: "Encerrar no mapa", target: "end:default" },
  ];
  draft.layout = { "q:nome": { x: 150, y: 280 }, end: { x: 150, y: 1200 } };
  draft.definition.completion.title = "Obrigado, @nome";
  draft.settings = {
    meta_pixel: { enabled: true, id: "123456789012345" },
    notify_emails: ["client-notify@example.invalid"],
    tracking: true,
    hidden_fields: ["vendedor"],
    minimum_seconds: 3,
  };
  let saved = await editor.req("save", { id, revision: f.revision, draft });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  for (const badPixel of [
    { enabled: true, id: "<script>" },
    { enabled: true, id: "" },
  ]) {
    assert.equal(
      (
        await editor.req("save", {
          id,
          revision: saved.body.revision,
          draft: {
            ...draft,
            settings: { ...draft.settings, meta_pixel: badPixel },
          },
        })
      ).status,
      422,
    );
  }
  assert.deepEqual(
    (await editor.req("form", undefined, { id })).body.form.draft.definition
      .welcome,
    draft.definition.welcome,
  );
  const forged = structuredClone(draft);
  forged.definition.welcome.media = media.other;
  assert.equal(
    (
      await editor.req("save", {
        id,
        revision: saved.body.revision,
        draft: forged,
      })
    ).status,
    422,
  );
  assert.deepEqual(
    (await editor.req("form", undefined, { id })).body.form.draft.layout,
    draft.layout,
  );
  assert.equal(
    (await reader.req("save", { id, revision: saved.body.revision, draft }))
      .status,
    403,
  );
  assert.equal(
    (await editor.req("save", { id, revision: f.revision, draft })).status,
    422,
  );
  let revision = saved.body.revision;
  assert.equal((await editor.req("publish", { id, revision })).status, 200);
  const published = sql(
    `SELECT fields_json FROM badon_test.forms WHERE id=${id}`,
  );
  assert.equal(Object.hasOwn(JSON.parse(published.trim()), "layout"), false);
  const ticket = await guest.req(
    "/f/cliente-a-form?utm_source=google&vendedor=stanley&senha=nao-salvar",
  );
  assert.equal(ticket.status, 200);
  assert.ok(
    ticket.body.includes('data-meta-pixel="123456789012345"') &&
      ticket.body.includes("/forms-assets/meta-pixel.js?v=1"),
  );
  assert.ok(
    ticket.headers
      .get("content-security-policy")
      .includes("https://connect.facebook.net"),
  );
  assert.ok(
    !ticket.body.includes("fbevents.js"),
    "SDK is not loaded by the HTML before consent",
  );
  assert.ok(!ticket.body.includes("client-notify@example.invalid"));
  assert.ok(!ticket.body.includes("wa.me/"));
  assert.deepEqual(
    publicDefinition(ticket.body).welcome,
    draft.definition.welcome,
  );
  assert.deepEqual(
    publicDefinition(ticket.body).fields[2].rules,
    draft.definition.fields[2].rules,
  );
  assert.ok(
    ticket.body.includes("welcome.css?v=1") &&
      ticket.body.includes("public-flow.js?v=7"),
  );
  // A layout-only publication must preserve the active public submission ticket.
  draft.layout["q:nome"].x = 240;
  saved = await editor.req("save", { id, revision, draft });
  revision = saved.body.revision;
  assert.equal(saved.status, 200);
  assert.equal((await editor.req("publish", { id, revision })).status, 200);
  assert.equal(
    sql(`SELECT fields_json FROM badon_test.forms WHERE id=${id}`),
    published,
  );
  draft.title = "Rascunho novo";
  draft.definition.welcome.media = media.video;
  draft.definition.welcome.layout = "background";
  draft.definition.fields[0].label = "Pergunta ainda não publicada";
  saved = await editor.req("save", { id, revision, draft });
  revision = saved.body.revision;
  assert.equal(
    sql(`SELECT fields_json FROM badon_test.forms WHERE id=${id}`),
    published,
  );
  assert.deepEqual(
    publicDefinition((await guest.req("/f/cliente-a-form")).body).welcome.media,
    media.image,
  );
  assert.ok(
    (await guest.req("/f/cliente-a-form")).body.includes("Qual é seu nome?"),
  );
  const payload = {
    csrf: token(ticket.body, "csrf"),
    submission: token(ticket.body, "submission"),
    form_id: String(id),
    consent: "1",
    "fields[nome]": "Stanley",
    "fields[email]": "newlead@example.invalid",
    "fields[interesses][]": "Site",
    "fields[data]": "2026-10-12",
  };
  assert.equal((await guest.req("/api/enviar.php", payload)).status, 429);
  await new Promise((r) => setTimeout(r, 3100));
  assert.equal(
    (
      await guest.req("/api/enviar.php", {
        ...payload,
        "fields[data]": "2026-02-31",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await guest.req("/api/enviar.php", {
        ...payload,
        "fields[interesses][]": "Inventado",
      })
    ).status,
    422,
  );
  assert.equal(
    (await guest.req("/api/enviar.php", { ...payload, consent: "" })).status,
    422,
  );
  const sent = await guest.req("/api/enviar.php", payload);
  assert.equal(sent.status, 303);
  assert.equal(
    sql(`SELECT email_status FROM badon_test.leads WHERE form_id=${id}`).trim(),
    "pending",
  );
  await worker();
  assert.ok(recipients.at(-1).includes("client-notify@example.invalid"));
  const confirm = await guest.req(sent.headers.get("location"));
  assert.ok(
    !confirm.body.includes("meta-pixel.js") &&
      !confirm.headers.get("content-security-policy").includes("facebook"),
    "Never run Pixel on private receipt URL",
  );
  assert.ok(confirm.body.includes("Obrigado, Stanley"));
  assert.ok(confirm.body.includes("Oi%2C+sou+Stanley"));
  const normalPixelResult = await sendPixelJSON(guest, payload);
  assert.equal(normalPixelResult.status, 200);
  assert.equal(normalPixelResult.body.pixel.id, "123456789012345");
  assert.equal(normalPixelResult.body.pixel.form_id, Number(id));
  assert.match(normalPixelResult.body.pixel.event_id, /^[a-f0-9]{64}$/);
  const rows = (await reader.req("leads", undefined, { id })).body.leads;
  assert.equal(rows.length, 1);
  const leadId = rows[0].id;
  assert.equal(
    (await reader.req("retry-mail", { id, lead_id: leadId })).status,
    403,
  );
  assert.equal(
    (await other.req("retry-mail", { id, lead_id: leadId })).status,
    403,
  );
  assert.equal(
    (await editor.req("retry-mail", { id, lead_id: leadId })).status,
    409,
  );
  sql(
    `UPDATE badon_test.leads SET email_status='sending', email_attempted_at=UTC_TIMESTAMP()-INTERVAL 11 MINUTE WHERE id=${leadId}`,
  );
  const staleRows = (await reader.req("leads", undefined, { id })).body.leads;
  assert.equal(staleRows[0].notification_stale, true);
  assert.equal(staleRows[0].can_retry, true);
  assert.equal(
    (await editor.req("retry-mail", { id, lead_id: 1 })).status,
    409,
  );
  assert.equal(
    (await editor.req("retry-mail", { id, lead_id: leadId })).status,
    200,
  );
  assert.equal(
    sql(`SELECT email_status FROM badon_test.leads WHERE id=${leadId}`).trim(),
    "pending",
  );
  await worker();
  assert.ok(rows[0].values_json.includes("google"));
  assert.ok(!rows[0].values_json.includes("nao-salvar"));
  assert.equal((await reader.req("export", { id })).status, 200);
  assert.equal(
    sql(`SELECT email_status FROM badon_test.leads WHERE form_id=${id}`).trim(),
    "sent",
  );
  assert.equal(
    sql(
      `SELECT COUNT(*) FROM badon_test.bf_deliveries WHERE lead_id=${rows[0].id}`,
    ).trim(),
    "1",
  );
  // Salvar um rascunho não invalidou o ticket da versão publicada.
  assert.equal((await guest.req("/api/enviar.php", payload)).status, 303);
  assert.equal((await editor.req("publish", { id, revision })).status, 200);
  assert.ok(
    (await guest.req("/f/cliente-a-form")).body.includes("Pergunta ainda"),
  );
  const early = new Client();
  const earlyPage = await early.req("/f/cliente-a-form");
  await new Promise((r) => setTimeout(r, 3100));
  const earlySent = await early.req("/api/enviar.php", {
    csrf: token(earlyPage.body, "csrf"),
    submission: token(earlyPage.body, "submission"),
    form_id: String(id),
    consent: "1",
    "fields[nome]": "Encerrar no mapa",
    "fields[email]": "forged-invalid-email",
    "fields[data]": "invalid-skipped-date",
  });
  assert.equal(earlySent.status, 303);
  const earlyLead = (await reader.req("leads", undefined, { id })).body
    .leads[0];
  assert.ok(earlyLead.values_json.includes("Encerrar no mapa"));
  assert.ok(!earlyLead.values_json.includes("forged-invalid-email"));
  assert.ok(
    (await early.req(earlySent.headers.get("location"))).body.includes(
      "Obrigado, Encerrar no mapa",
    ),
  );
  const multiGuest = new Client();
  const multiPage = await multiGuest.req("/f/cliente-a-form");
  await new Promise((r) => setTimeout(r, 3100));
  const multiPayload = [
    ["csrf", token(multiPage.body, "csrf")],
    ["submission", token(multiPage.body, "submission")],
    ["form_id", String(id)],
    ["consent", "1"],
    ["fields[nome]", "Teste múltipla"],
    ["fields[email]", "multiple@example.invalid"],
    ["fields[interesses][]", "Tráfego"],
    ["fields[interesses][]", "Menos de R$ 1.000,00"],
    ["fields[data]", "FORGED-SKIPPED"],
  ];
  assert.equal(
    (
      await multiGuest.req(
        "/api/enviar.php",
        multiPayload.filter(([key]) => key !== "consent"),
      )
    ).status,
    422,
  );
  async function sendPixelJSON(client, data) {
    const response = await fetch(base + "/api/enviar.php", {
      method: "POST",
      redirect: "manual",
      headers: { Cookie: client.cookie, Accept: "application/json" },
      body: new URLSearchParams(data),
    });
    return { status: response.status, body: await response.json() };
  }
  const invalidPixelSend = await sendPixelJSON(
    multiGuest,
    multiPayload.filter(([key]) => key !== "consent"),
  );
  assert.equal(invalidPixelSend.status, 422);
  assert.equal(invalidPixelSend.body.pixel, undefined);
  const multiSent = await sendPixelJSON(multiGuest, multiPayload);
  assert.equal(multiSent.status, 200);
  assert.equal(multiSent.body.pixel.id, "123456789012345");
  assert.equal(multiSent.body.pixel.form_id, Number(id));
  assert.match(multiSent.body.pixel.event_id, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(multiSent.body.pixel).sort(), [
    "event_id",
    "form_id",
    "id",
  ]);
  assert.ok(
    !JSON.stringify(multiSent.body).includes("multiple@example.invalid"),
  );
  const multiLead = (await reader.req("leads", undefined, { id })).body
    .leads[0];
  assert.ok(multiLead.values_json.includes("Encerramento condicional"));
  assert.ok(multiLead.values_json.includes("Menos de R$ 1.000,00"));
  assert.ok(!multiLead.values_json.includes("FORGED-SKIPPED"));
  const multiConfirm = await multiGuest.req(multiSent.body.redirect);
  assert.ok(
    multiConfirm.body.includes("Obrigado pelo interesse") &&
      !multiConfirm.body.includes("wa.me/"),
  );
  assert.equal(
    (await multiGuest.req("/api/enviar.php", multiPayload)).status,
    303,
  );
  assert.deepEqual(
    (await sendPixelJSON(multiGuest, multiPayload)).body,
    multiSent.body,
    "Same Lead event ID on retry",
  );
  draft.settings.meta_pixel.enabled = false;
  saved = await editor.req("save", { id, revision, draft });
  revision = saved.body.revision;
  assert.equal(saved.status, 200);
  assert.ok(
    (await guest.req("/f/cliente-a-form")).body.includes(
      'data-meta-pixel="123456789012345"',
    ),
    "Draft does not change public Pixel",
  );
  assert.equal((await editor.req("publish", { id, revision })).status, 200);
  const disabledPixel = await guest.req("/f/cliente-a-form");
  assert.ok(
    !disabledPixel.body.includes("meta-pixel.js") &&
      !disabledPixel.headers
        .get("content-security-policy")
        .includes("facebook"),
  );
  console.log(
    "OK: Pixel por formulário, publicação separada, ID validado, Lead em encerramento condicional, JSON idempotente e nenhum rastreamento no recibo.",
  );
  console.log(
    "OK: condição múltipla salva/publicada, seleção com moeda, consentimento, encerramento sem campos pulados e envio idempotente.",
  );
  const dup = await editor.req("duplicate", { id });
  assert.equal(dup.status, 200);
  assert.deepEqual(
    publicDefinition((await guest.req("/f/cliente-a-form")).body).welcome.media,
    media.video,
  );
  assert.deepEqual(
    (await editor.req("form", undefined, { id: dup.body.id })).body.form.draft
      .definition.welcome.media,
    media.video,
  );
  assert.equal(
    (await editor.req("form", undefined, { id: dup.body.id })).body.form.active,
    false,
  );
  await agency.req("folder-create", { workspace: wb, name: "Privado B" });
  const folders = (await other.req("forms", undefined, { workspace: wb })).body
    .folders;
  assert.equal(
    (
      await editor.req("save", {
        id,
        revision,
        draft,
        folder_id: folders[0].id,
      })
    ).status,
    422,
  );
  draft.settings.webhook_url = "http://127.0.0.1/private";
  assert.equal((await editor.req("save", { id, revision, draft })).status, 422);
  delete draft.settings.webhook_url;
  assert.equal((await editor.req("status", { id, active: false })).status, 200);
  assert.equal((await guest.req("/f/cliente-a-form")).status, 404);
  const member = (
    await agency.req("members", undefined, { workspace: wa })
  ).body.members.find((m) => m.email === "reader@example.invalid");
  await agency.req("member-remove", { workspace: wa, id: member.id });
  assert.equal((await reader.req("leads", undefined, { id })).status, 403);
  const magic = new Api();
  await magic.req("boot");
  assert.equal(
    (await magic.req("magic", { email: "editor@example.invalid" })).status,
    200,
  );
  const magicToken = messages.at(-1).match(/#token=([a-f0-9]{64})/)[1];
  assert.equal((await magic.req("accept", { token: magicToken })).status, 200);
  assert.equal((await magic.req("boot")).body.user.agency, false);
  assert.equal(
    (await agency.req("forms", undefined, { workspace: badon })).status,
    200,
  );
  console.log(
    "OK: React/PHP, migração aditiva, workspaces isolados, papéis, convites/link mágico, rascunho/publicação, SMTP, rastreamento, antifraude, CSV e revogação.",
  );
}
