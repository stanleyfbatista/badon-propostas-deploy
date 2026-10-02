import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function crmTests({
  base,
  agency,
  editor,
  reader,
  other,
  wa,
  wb,
  id,
  sql,
  run,
  php,
  cli,
  Api,
  messages,
}) {
  const emailCount = messages.length;
  const before = sql("SELECT COUNT(*) FROM badon_test.leads").trim();
  const manual = {
    workspace: wa,
    create_key: randomUUID(),
    name: "Contato manual",
    company: "Empresa local",
    document: "",
    email: "crm@example.invalid",
    phone: "5511999999999",
    stage: "qualified",
    assignee: null,
    amount: "3000.50",
    source: "Indicação",
    notes: "Conversa inicial",
    next_action: "Diagnóstico",
    scheduled_at: "2027-01-05T15:30:00Z",
  };
  const created = await editor.req("crm-create", manual);
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const oid = created.body.id;
  assert.ok(oid);
  assert.equal((await editor.req("crm-create", manual)).body.id, oid);
  assert.equal(
    sql(
      `SELECT COUNT(*) FROM badon_test.bf_crm_events WHERE opportunity_id=${oid}`,
    ).trim(),
    "1",
  );
  assert.equal(
    (await reader.req("crm-create", { ...manual, create_key: randomUUID() }))
      .status,
    403,
  );
  assert.equal(
    (await other.req("crm-item", undefined, { workspace: wa, id: oid })).status,
    403,
  );
  assert.equal(
    (await other.req("crm-item", undefined, { workspace: wb, id: oid })).status,
    404,
  );
  let detail = (
    await editor.req("crm-item", undefined, { workspace: wa, id: oid })
  ).body;
  assert.equal(detail.item.scheduled_at, "2027-01-05 15:30:00");
  assert.equal(detail.item.amount, "3000.50");
  const toPayload = (i) => ({
    ...i,
    workspace: wa,
    scheduled_at: i.scheduled_at
      ? i.scheduled_at.replace(" ", "T") + "Z"
      : null,
  });
  const updated = { ...toPayload(detail.item), stage: "won" };
  assert.equal((await editor.req("crm-update", updated)).status, 200);
  assert.equal((await editor.req("crm-update", updated)).status, 409);
  assert.equal(
    (await reader.req("crm-update", { ...updated, revision: 2 })).status,
    403,
  );
  detail = (await editor.req("crm-item", undefined, { workspace: wa, id: oid }))
    .body;
  assert.match(detail.events[0].message, /Qualificado → Fechado/);
  assert.equal(
    (
      await editor.req("crm-note", {
        workspace: wa,
        id: oid,
        revision: detail.item.revision,
        message: "<script>não executar</script>",
      })
    ).status,
    200,
  );
  detail = (await editor.req("crm-item", undefined, { workspace: wa, id: oid }))
    .body;
  assert.equal(detail.events[0].message, "<script>não executar</script>");
  assert.equal(
    (
      await editor.req("crm-complete", {
        workspace: wa,
        id: oid,
        revision: detail.item.revision,
      })
    ).status,
    200,
  );
  detail = (await editor.req("crm-item", undefined, { workspace: wa, id: oid }))
    .body;
  assert.equal(detail.item.scheduled_at, null);
  assert.ok(detail.item.last_contact_at);
  const foreignActor = (await other.req("boot")).body.profile.actor;
  assert.equal(
    (
      await editor.req("crm-update", {
        ...toPayload(detail.item),
        assignee: foreignActor,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await editor.req("crm-update", {
        ...toPayload(detail.item),
        stage: "injected",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await editor.req("crm-update", {
        ...toPayload(detail.item),
        amount: "-1",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await editor.req("crm-update", {
        ...toPayload(detail.item),
        scheduled_at: "2027-02-30T10:00:00Z",
      })
    ).status,
    422,
  );
  const filtered = (
    await reader.req("crm-list", undefined, {
      workspace: wa,
      search: "Contato manual",
      stage: "won",
    })
  ).body;
  assert.equal(Number(filtered.metrics.total), 1);
  assert.equal(Number(filtered.metrics.won), 1);
  assert.equal(filtered.items[0].id, oid);
  assert.equal(
    (
      await reader.req("crm-list", undefined, {
        workspace: wa,
        search: "Contato manual",
        agenda: 1,
      })
    ).body.items.length,
    0,
  );
  assert.equal(
    (
      await reader.req("crm-list", undefined, {
        workspace: wa,
        from: "2027-01-01T00:00:00Z",
      })
    ).body.items.length,
    0,
  );
  const captured = (
    await agency.req("crm-list", undefined, { workspace: wa })
  ).body.items.filter((i) => i.lead_id);
  assert.ok(
    captured.length > 0,
    "public submissions create opportunities with cron off",
  );
  const lead = captured.find(
    (i) =>
      Number(
        sql(
          `SELECT form_id FROM badon_test.leads WHERE id=${i.lead_id}`,
        ).trim(),
      ) === id,
  );
  assert.ok(lead);
  const answers = (
    await editor.req("crm-item", undefined, { workspace: wa, id: lead.id })
  ).body.answers;
  assert.ok(answers.some((a) => a.key === "_flow_outcome"));
  assert.equal(
    sql(
      "SELECT COUNT(*) FROM badon_test.bf_opportunities WHERE lead_id IS NOT NULL",
    ).trim(),
    before,
  );
  run(php, [cli, "crm:migrate"]);
  run(php, [cli, "crm:migrate"]);
  assert.equal(sql("SELECT COUNT(*) FROM badon_test.leads").trim(), before);
  assert.equal(
    sql(
      "SELECT COUNT(*) FROM badon_test.bf_opportunities WHERE lead_id IS NOT NULL",
    ).trim(),
    before,
  );
  assert.equal(
    (await editor.req("crm-item", undefined, { workspace: wa, id: oid })).body
      .item.stage,
    "won",
  );
  const own = await reader.req("profile-save", {
    name: "Sócio",
    phone: "5511999999999",
    appearance: "dark",
    actor: foreignActor,
  });
  assert.equal(own.status, 200);
  assert.equal(own.body.profile.name, "Sócio");
  assert.notEqual(own.body.profile.actor, foreignActor);
  assert.equal((await other.req("profile")).body.profile.name, "");
  const profile = (await reader.req("boot")).body.profile;
  assert.equal(profile.appearance, "dark");
  const send = async (user, bytes, name = "foto.png", csrf = user.csrf) => {
    const body = new FormData();
    body.append("file", new Blob([bytes]), name);
    const r = await fetch(base + "/api/profile-photo.php", {
      method: "POST",
      headers: { Cookie: user.cookie || "", "X-CSRF-Token": csrf || "" },
      body,
    });
    return { status: r.status, body: await r.json() };
  };
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  assert.equal((await send({}, png)).status, 401);
  assert.equal((await send(reader, png, "foto.png", "wrong")).status, 403);
  assert.equal(
    (
      await send(
        reader,
        Buffer.from('<svg onload="alert(1)"></svg>'),
        "foto.svg",
      )
    ).status,
    422,
  );
  const photo = await send(reader, png);
  assert.equal(photo.status, 200, JSON.stringify(photo.body));
  const url = base + photo.body.profile.avatar_url;
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    (await fetch(url, { headers: { Cookie: other.cookie } })).status,
    404,
  );
  const shared = await fetch(url, { headers: { Cookie: editor.cookie } });
  assert.equal(shared.status, 200);
  assert.equal(shared.headers.get("content-type"), "image/png");
  assert.match(shared.headers.get("cache-control"), /no-store/);
  assert.equal(
    (
      await reader.req("profile-password", {
        current: "incorrect",
        password: "new-long-password",
      })
    ).status,
    422,
  );
  const second = new Api();
  await second.req("boot");
  assert.equal(
    (
      await second.req("login", {
        email: "editor@example.invalid",
        password: editor.testPassword,
      })
    ).status,
    200,
  );
  await second.req("boot");
  assert.equal(
    (
      await editor.req("profile-password", {
        current: editor.testPassword,
        password: "new-long-password",
      })
    ).status,
    200,
  );
  assert.ok((await editor.req("boot")).body.user);
  assert.equal((await second.req("boot")).body.user, null);
  const remove = new FormData();
  remove.append("remove", "1");
  assert.equal(
    (
      await fetch(base + "/api/profile-photo.php", {
        method: "POST",
        headers: { Cookie: reader.cookie, "X-CSRF-Token": reader.csrf },
        body: remove,
      })
    ).status,
    200,
  );
  assert.equal((await reader.req("profile")).body.profile.avatar_url, null);
  assert.equal(messages.length, emailCount, "CRM/profile must not send email");
  console.log(
    "OK: CRM persistente, captura automática, migração idempotente, isolamento, leitor, conflitos, histórico, agenda, perfil, foto privada e troca de senha sem e-mail.",
  );
}
