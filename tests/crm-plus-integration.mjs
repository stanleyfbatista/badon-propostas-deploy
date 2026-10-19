import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function crmPlusTests({
  editor,
  reader,
  other,
  wa,
  wb,
  sql,
  run,
  php,
  cli,
  messages,
}) {
  const emailCount = messages.length;
  const before = sql(
    "SELECT id,name,stage,revision FROM badon_test.bf_opportunities ORDER BY id",
  );
  run(php, [cli, "crm:upgrade"]);
  run(php, [cli, "crm:upgrade"]);
  assert.equal(
    sql(
      "SELECT id,name,stage,revision FROM badon_test.bf_opportunities ORDER BY id",
    ),
    before,
  );
  const save = (client, data) =>
    client.req("crm-plus-directory-save", {
      workspace: wa,
      create_key: randomUUID(),
      ...data,
    });
  const companyPayload = {
    kind: "company",
    name: "Empresa teste CRM+",
    email: "empresa@example.invalid",
    phone: "",
    notes: "Observações",
    document: "123",
    create_key: randomUUID(),
  };
  const created = await save(editor, companyPayload);
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const company = created.body.id;
  assert.equal((await save(editor, companyPayload)).body.id, company);
  assert.equal(
    (await save(reader, { kind: "company", name: "Proibido" })).status,
    403,
  );
  assert.equal(
    (await other.req("crm-plus-directory", undefined, { workspace: wa }))
      .status,
    403,
  );
  assert.equal(
    (
      await save(editor, {
        kind: "contact",
        name: "Pessoa teste",
        company_id: 999999,
      })
    ).status,
    422,
  );
  const contact = (
    await save(editor, {
      kind: "contact",
      name: "Pessoa teste",
      email: "pessoa@example.invalid",
      company_id: company,
      job_title: "Diretora",
    })
  ).body.id;
  assert.ok(contact);
  const contactRow = (
    await editor.req("crm-plus-directory", undefined, {
      workspace: wa,
      kind: "contact",
      id: contact,
    })
  ).body.items[0];
  assert.equal(contactRow.company_name, companyPayload.name);
  assert.equal(
    (
      await editor.req("crm-plus-directory", undefined, {
        workspace: wa,
        kind: "contact",
        company_id: company,
      })
    ).body.total,
    1,
  );
  assert.equal(
    (
      await editor.req("crm-plus-directory", undefined, {
        workspace: wa,
        kind: "contact",
        company_id: 0,
      })
    ).body.total,
    0,
  );
  assert.equal(
    (
      await other.req("crm-plus-directory", undefined, {
        workspace: wb,
        kind: "contact",
        id: contact,
      })
    ).body.total,
    0,
  );
  const payload = {
    workspace: wa,
    create_key: randomUUID(),
    name: "Pessoa teste",
    company: "Empresa teste CRM+",
    email: "pessoa@example.invalid",
    amount: "4500",
    stage: "qualified",
    source: "Teste",
    company_id: company,
    contact_id: contact,
    service: "Site institucional",
    expected_close: "2027-02-28",
    loss_reason: "",
    assignee: null,
  };
  const opportunity = await editor.req("crm-create", payload);
  assert.equal(opportunity.status, 200, JSON.stringify(opportunity.body));
  const id = opportunity.body.id;
  const get = async () => {
    const r = await editor.req("crm-item", undefined, { workspace: wa, id });
    assert.equal(r.status, 200);
    return r.body;
  };
  let detail = await get();
  assert.equal(Number(detail.item.company_id), company);
  assert.equal(Number(detail.item.contact_id), contact);
  assert.equal(detail.item.service, "Site institucional");
  assert.equal(detail.linked.contact.job_title, "Diretora");
  assert.equal(
    (
      await editor.req("crm-create", {
        ...payload,
        create_key: randomUUID(),
        expected_close: "2027-02-30",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await editor.req("crm-create", {
        ...payload,
        create_key: randomUUID(),
        company_id: null,
      })
    ).status,
    422,
  );
  const foreignCompany = (
    await other.req("crm-plus-directory-save", {
      workspace: wb,
      kind: "company",
      create_key: randomUUID(),
      name: "Outro espaço",
    })
  ).body.id;
  assert.equal(
    (
      await editor.req("crm-update", {
        ...detail.item,
        workspace: wa,
        company_id: foreignCompany,
      })
    ).status,
    422,
  );
  // A legacy client updating a stage must not erase the new metadata.
  const legacy = { ...detail.item, workspace: wa, stage: "follow_up" };
  for (const k of [
    "company_id",
    "contact_id",
    "service",
    "expected_close",
    "loss_reason",
  ])
    delete legacy[k];
  assert.equal((await editor.req("crm-update", legacy)).status, 200);
  assert.equal((await editor.req("crm-update", legacy)).status, 409);
  detail = await get();
  assert.equal(detail.item.service, "Site institucional");
  assert.equal(
    (await save(editor, { ...contactRow, kind: "contact", company_id: null }))
      .status,
    422,
  );
  assert.equal(
    (await save(editor, { ...contactRow, kind: "contact", job_title: "Sócia" }))
      .status,
    200,
  );
  assert.equal(
    (await save(editor, { ...contactRow, kind: "contact", job_title: "Stale" }))
      .status,
    409,
  );
  const activity = {
    workspace: wa,
    id,
    create_key: randomUUID(),
    kind: "call",
    subject: "Retomar proposta",
    body: "Ligação agendada",
    due_at: "2020-01-01T12:00:00Z",
  };
  assert.equal(
    (await reader.req("crm-plus-activity-add", activity)).status,
    403,
  );
  assert.equal(
    (await other.req("crm-plus-activity-add", { ...activity, workspace: wb }))
      .status,
    404,
  );
  assert.equal(
    (await editor.req("crm-plus-activity-add", activity)).status,
    200,
  );
  assert.equal(
    (await editor.req("crm-plus-activity-add", activity)).status,
    200,
  );
  detail = await get();
  assert.equal(detail.activities.length, 1);
  assert.equal(detail.item.last_contact_at, null);
  const listing = await editor.req("crm-list", undefined, {
    workspace: wa,
    company_id: company,
    focus: "overdue",
    sort: "activity",
    agenda: 1,
  });
  assert.equal(listing.status, 200, JSON.stringify(listing.body));
  assert.equal(listing.body.items[0].id, id);
  assert.equal(Number(listing.body.metrics.overdue), 1);
  assert.equal(
    (
      await editor.req("crm-plus-activity-add", {
        ...activity,
        create_key: randomUUID(),
        due_at: null,
      })
    ).status,
    422,
  );
  const completed = { workspace: wa, id, activity_id: detail.activities[0].id };
  assert.equal(
    (await editor.req("crm-plus-activity-complete", completed)).status,
    200,
  );
  const revision = (await get()).item.revision;
  assert.equal(
    (await editor.req("crm-plus-activity-complete", completed)).status,
    200,
  );
  detail = await get();
  assert.equal(detail.item.revision, revision);
  assert.ok(detail.item.last_contact_at);
  assert.equal(
    (
      await editor.req("crm-list", undefined, {
        workspace: wa,
        company_id: company,
        focus: "overdue",
      })
    ).body.items.length,
    0,
  );
  for (const sort of ["amount", "closing", "activity", "malicious SQL"])
    assert.equal(
      (await editor.req("crm-list", undefined, { workspace: wa, sort })).status,
      200,
    );
  assert.equal(
    (
      await editor.req("crm-plus-activity-add", {
        ...activity,
        kind: "email",
        completed: true,
        create_key: randomUUID(),
        due_at: null,
      })
    ).status,
    200,
  );
  const view = {
    workspace: wa,
    name: "Minha carteira",
    filters: {
      company_id: String(company),
      focus: "open",
      sort: "amount",
      mode: "list",
      from: "2026-01-01",
    },
  };
  assert.equal((await editor.req("crm-plus-view-save", view)).status, 200);
  assert.equal((await editor.req("crm-plus-view-save", view)).status, 422);
  assert.equal(
    (
      await editor.req("crm-plus-view-save", {
        ...view,
        name: "Inválido",
        filters: { from: "2026-02-30" },
      })
    ).status,
    422,
  );
  const views = (
    await editor.req("crm-plus-views", undefined, { workspace: wa })
  ).body.items;
  assert.equal(views.length, 1);
  assert.equal(views[0].filters.company_id, String(company));
  assert.equal(
    (await reader.req("crm-plus-views", undefined, { workspace: wa })).body
      .items.length,
    0,
  );
  await reader.req("crm-plus-view-delete", { workspace: wa, id: views[0].id });
  assert.equal(
    (await editor.req("crm-plus-views", undefined, { workspace: wa })).body
      .items.length,
    1,
  );
  // Read-only members can save personal filters, but cannot edit shared CRM records.
  assert.equal((await reader.req("crm-plus-view-save", view)).status, 200);
  await editor.req("crm-plus-view-delete", { workspace: wa, id: views[0].id });
  assert.equal(
    (await editor.req("crm-plus-views", undefined, { workspace: wa })).body
      .items.length,
    0,
  );
  assert.equal(
    messages.length,
    emailCount,
    "No external messages or paid service calls",
  );
  console.log(
    "OK: CRM+ cadastros vinculados, isolamento, revisões, migração aditiva, follow-ups idempotentes, filtros privados e compatibilidade legada.",
  );
}
