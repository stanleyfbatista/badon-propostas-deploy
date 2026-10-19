import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function flowHubTests({
  base,
  agency,
  editor,
  reader,
  other,
  wa,
  wb,
  run,
  php,
  cli,
  sql,
  messages,
}) {
  const mails = messages.length;
  const counts = sql(
    "SELECT (SELECT COUNT(*) FROM badon_test.forms),(SELECT COUNT(*) FROM badon_test.leads),(SELECT COUNT(*) FROM badon_test.bf_opportunities),(SELECT COUNT(*) FROM badon_test.bf_tasks)",
  ).trim();
  assert.equal((await agency.req("boot")).body.flow_ready, false);
  run(php, [cli, "flow:migrate"]);
  run(php, [cli, "flow:migrate"]);
  assert.equal((await agency.req("boot")).body.flow_ready, true);
  assert.equal(
    sql(
      "SELECT (SELECT COUNT(*) FROM badon_test.forms),(SELECT COUNT(*) FROM badon_test.leads),(SELECT COUNT(*) FROM badon_test.bf_opportunities),(SELECT COUNT(*) FROM badon_test.bf_tasks)",
    ).trim(),
    counts,
  );
  for (const user of [editor, reader, other]) {
    for (const action of [
      "flow-clients",
      "flow-sales",
      "flow-overview",
      "flow-client-history",
      "flow-sale-item",
      "flow-projects",
      "flow-work",
    ])
      assert.equal(
        (
          await user.req(action, undefined, {
            id: 1,
            workspace: wa,
            today: "2027-01-05",
          })
        ).status,
        403,
        action,
      );
    assert.equal((await user.req("flow-client-create", {})).status, 403);
  }
  const client = {
    name: "Cliente direto QA",
    contact: "Joana QA",
    email: "joana-qa@example.invalid",
    phone: "11999999999",
    document: "",
    active: true,
    create_key: randomUUID(),
    details: {
      briefing: "Briefing preservado",
      brand: "Identidade visual",
      resources: [
        {
          name: "Manual",
          url: "https://example.invalid/manual.pdf",
          category: "brand",
        },
      ],
      contract_status: "signed",
      contract_start: "2027-01-01",
      contract_end: "2027-12-31",
      notice_days: 30,
    },
  };
  const made = await agency.req("flow-client-create", client);
  assert.equal(made.status, 200, JSON.stringify(made.body));
  const cid = made.body.id;
  assert.equal((await agency.req("flow-client-create", client)).body.id, cid);
  assert.equal(
    (
      await agency.req("flow-client-create", {
        ...client,
        create_key: randomUUID(),
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await agency.req("flow-client-create", {
        ...client,
        create_key: randomUUID(),
        email: "",
        details: { cover: "javascript:alert(1)" },
      })
    ).status,
    422,
  );
  let c = (await agency.req("flow-clients")).body.items.find(
    (x) => Number(x.workspace_id) === cid,
  );
  assert.equal(c.details.briefing, "Briefing preservado");
  assert.equal(
    (
      await agency.req("flow-client-save", {
        ...c,
        id: cid,
        name: "Cliente direto atualizado",
      })
    ).status,
    200,
  );
  assert.equal(
    (await agency.req("flow-client-save", { ...c, id: cid })).status,
    409,
  );
  const upload = async (
    user,
    workspace,
    bytes,
    name = "documento.pdf",
    task = 0,
    csrf = user.csrf,
  ) => {
    const form = new FormData();
    form.set("workspace", String(workspace));
    form.set("file", new Blob([bytes]), name);
    if (task) form.set("task", String(task));
    return fetch(base + "/api/flow-file.php", {
      method: "POST",
      headers: { Cookie: user.cookie, "X-CSRF-Token": csrf },
      body: form,
    });
  };
  const pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
  assert.equal(
    (await upload(agency, cid, pdf, "doc.pdf", 0, "wrong")).status,
    403,
  );
  assert.equal((await upload(editor, wa, pdf)).status, 403);
  assert.equal(
    (await upload(agency, cid, "<svg><script>alert(1)</script></svg>", "x.svg"))
      .status,
    422,
  );
  const file = await upload(agency, cid, pdf);
  assert.equal(file.status, 200);
  const attachment = await file.json();
  assert.equal((await fetch(base + attachment.url)).status, 401);
  assert.equal(
    (await fetch(base + attachment.url, { headers: { Cookie: other.cookie } }))
      .status,
    403,
  );
  const download = await fetch(base + attachment.url, {
    headers: { Cookie: agency.cookie },
  });
  assert.equal(download.status, 200);
  assert.match(download.headers.get("content-disposition"), /attachment/);
  assert.equal(await download.text(), pdf);
  c = (await agency.req("flow-clients")).body.items.find(
    (x) => Number(x.workspace_id) === cid,
  );
  assert.equal(
    (
      await agency.req("flow-client-save", {
        ...c,
        id: cid,
        details: { ...c.details, contract_url: attachment.url },
      })
    ).status,
    200,
  );
  const project = await agency.req("flow-project-create", {
    workspace: cid,
    name: "Campanha novembro",
    description: "Briefing do projeto",
    create_key: randomUUID(),
  });
  assert.equal(project.status, 200);
  const actor = (await agency.req("boot")).body.profile.actor;
  const task = {
    workspace: cid,
    create_key: randomUUID(),
    title: "Criativos",
    description: "Copy",
    status: "doing",
    priority: "normal",
    visibility: "team",
    assignee: actor,
    project_id: project.body.id,
    due_date: "2027-01-06",
    checklist: [],
    extras: {
      tags: ["Campanha"],
      links: [{ name: "Referência", url: "https://example.invalid/ref" }],
      cover: "",
    },
  };
  const parent = await agency.req("task-create", task);
  assert.equal(parent.status, 200, JSON.stringify(parent.body));
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAADElEQVQImWNgYGAAAAAEAAGjChXjAAAAAElFTkSuQmCC",
    "base64",
  );
  const imageUpload = await upload(
    agency,
    cid,
    png,
    "Capa de teste.png",
    parent.body.id,
  );
  assert.equal(imageUpload.status, 200, await imageUpload.clone().text());
  const imageFile = await imageUpload.json();
  let parentDetail = (
    await agency.req("task-item", undefined, {
      workspace: cid,
      id: parent.body.id,
    })
  ).body;
  assert.deepEqual(
    parentDetail.files,
    [],
    "Uploads não vinculados não entram na galeria",
  );
  const imageExtras = {
    ...parentDetail.item.extras,
    cover: imageFile.url,
    links: [
      ...parentDetail.item.extras.links,
      { name: imageFile.name, url: imageFile.url },
    ],
  };
  assert.equal(
    (
      await agency.req("task-update", {
        ...parentDetail.item,
        workspace: cid,
        extras: imageExtras,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await agency.req("task-update", {
        ...parentDetail.item,
        workspace: cid,
        priority: "urgent",
      })
    ).status,
    409,
    "Edição rápida obsoleta deve preservar anexos novos",
  );
  parentDetail = (
    await agency.req("task-item", undefined, {
      workspace: cid,
      id: parent.body.id,
    })
  ).body;
  assert.deepEqual(parentDetail.files, [imageFile]);
  assert.equal(parentDetail.item.extras.cover, imageFile.url);
  assert.equal((await fetch(base + imageFile.url)).status, 401);
  assert.equal(
    (await fetch(base + imageFile.url, { headers: { Cookie: other.cookie } }))
      .status,
    403,
  );
  assert.equal(
    (
      await agency.req("task-item", undefined, {
        workspace: cid,
        id: parent.body.id,
      })
    ).body.item.description,
    "Copy",
  );
  const sub = await agency.req("task-create", {
    ...task,
    create_key: randomUUID(),
    title: "Criativo 01",
    parent_id: parent.body.id,
  });
  assert.equal(sub.status, 200);
  assert.equal(
    (
      await agency.req("task-create", {
        ...task,
        create_key: randomUUID(),
        parent_id: sub.body.id,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await agency.req("task-create", {
        ...task,
        workspace: wb,
        create_key: randomUUID(),
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await agency.req("task-create", {
        ...task,
        create_key: randomUUID(),
        extras: { cover: "javascript:alert(1)" },
      })
    ).status,
    422,
  );
  const dashboard = await agency.req("flow-overview", undefined, {
    today: "2027-01-05",
  });
  assert.equal(dashboard.status, 200, JSON.stringify(dashboard.body));
  assert.equal(dashboard.body.attention_end, "2027-01-08");
  assert.equal(
    dashboard.body.tasks.find((t) => Number(t.id) === parent.body.id).assignee,
    actor,
  );
  const work = await agency.req("flow-work", undefined, {
    workspace: cid,
    project: project.body.id,
    search: "Criativo",
    assignee: actor,
    from: "2027-01-01",
    to: "2027-01-31",
  });
  assert.equal(work.status, 200, JSON.stringify(work.body));
  assert.equal(work.body.total, 2);
  assert.ok(
    work.body.items.every(
      (t) =>
        Number(t.workspace_id) === cid &&
        Number(t.project_id) === project.body.id,
    ),
  );
  assert.equal(work.body.items[0].project_name, "Campanha novembro");
  assert.equal(
    (
      await agency.req("flow-work", undefined, {
        workspace: cid,
        from: "2027-02-01",
        to: "2027-02-28",
      })
    ).body.total,
    0,
  );
  assert.equal(
    (
      await agency.req("flow-work", undefined, {
        workspace: cid,
        status: "review",
      })
    ).body.total,
    0,
  );
  assert.equal(
    (
      await agency.req("flow-work", undefined, {
        workspace: cid,
        from: "not-a-date",
      })
    ).status,
    422,
  );
  const privateEditor = await editor.req("task-create", {
    ...task,
    workspace: wa,
    project_id: null,
    assignee: null,
    visibility: "private",
    create_key: randomUUID(),
    title: "Editor private isolation",
  });
  assert.equal(privateEditor.status, 200);
  assert.ok(
    !(await agency.req("flow-work")).body.items.some(
      (t) => Number(t.id) === privateEditor.body.id,
    ),
  );
  const listedClient = (await agency.req("flow-clients")).body.items.find(
    (c) => Number(c.workspace_id) === cid,
  );
  assert.equal(Number(listedClient.counts.projects), 1);
  assert.equal(Number(listedClient.counts.demands), 2);
  const opp = {
    workspace: wa,
    create_key: randomUUID(),
    name: "Joana QA",
    company: "Empresa QA",
    email: client.email,
    stage: "follow_up",
    amount: "1500",
    notes: "Contexto da venda",
    source: "Funil QA",
  };
  const o = await agency.req("crm-create", opp);
  assert.equal(o.status, 200);
  const id = o.body.id;
  assert.equal(
    (
      await agency.req("flow-sale-pay", {
        id,
        confirmed: true,
        reference: "QA",
      })
    ).status,
    422,
  );
  assert.equal((await agency.req("flow-sale-send", { id })).status, 200);
  assert.equal((await agency.req("flow-sale-send", { id })).status, 200);
  let s = (await agency.req("flow-sale-item", undefined, { id })).body.sale;
  assert.equal(s.state, "approval");
  assert.equal(
    (
      await agency.req("flow-sale-pay", {
        id,
        revision: s.revision,
        confirmed: true,
        reference: "QA",
      })
    ).status,
    422,
  );
  assert.equal(
    (await agency.req("flow-sale-approve", { id, revision: s.revision }))
      .status,
    200,
  );
  assert.equal(
    (await agency.req("flow-sale-return", { id, revision: s.revision })).status,
    409,
  );
  s = (await agency.req("flow-sale-item", undefined, { id })).body.sale;
  assert.equal(s.approved_amount, "1500.00");
  assert.equal(
    (
      await agency.req("flow-sale-pay", {
        id,
        revision: s.revision,
        reference: "PIX QA",
        confirmed: true,
      })
    ).status,
    422,
    "Duplicate client must require explicit choice",
  );
  assert.equal(
    (
      await agency.req("flow-sale-pay", {
        id,
        revision: s.revision,
        reference: "PIX QA",
        confirmed: false,
        client_id: cid,
      })
    ).status,
    422,
  );
  const paid = {
    id,
    revision: s.revision,
    reference: "PIX QA",
    confirmed: true,
    client_id: cid,
  };
  assert.equal((await agency.req("flow-sale-pay", paid)).status, 200);
  assert.equal((await agency.req("flow-sale-pay", paid)).body.client_id, cid);
  const history = (
    await agency.req("flow-client-history", undefined, { id: cid })
  ).body.sales;
  assert.equal(history.length, 1);
  assert.equal(history[0].notes, "Contexto da venda");
  assert.match(history[0].events[0].message, /manualmente/);
  assert.equal(
    (await agency.req("crm-item", undefined, { workspace: wa, id })).body.item
      .stage,
    "won",
  );
  const newOpp = (
    await agency.req("crm-create", {
      ...opp,
      create_key: randomUUID(),
      email: "new-flow@example.invalid",
      name: "Novo cliente QA",
    })
  ).body.id;
  await agency.req("flow-sale-send", { id: newOpp });
  await agency.req("flow-sale-approve", { id: newOpp, revision: 1 });
  assert.equal(
    (
      await agency.req("flow-sale-pay", {
        id: newOpp,
        revision: 2,
        reference: "Transferência QA",
        confirmed: true,
      })
    ).status,
    200,
  );
  const resulting = (
    await agency.req("flow-sale-item", undefined, { id: newOpp })
  ).body.sale;
  assert.ok(resulting.client_workspace_id);
  assert.equal((await editor.req("flow-sale-pay", { id: newOpp })).status, 403);
  const cloneHash = randomUUID().replaceAll("-", "").padEnd(64, "0");
  sql(
    `INSERT INTO badon_test.leads (form_id,form_title,values_json,reply_email,consent_text,consent_accepted,privacy_url,created_at,submission_hash) SELECT form_id,form_title,values_json,reply_email,consent_text,consent_accepted,privacy_url,created_at,'${cloneHash}' FROM badon_test.leads WHERE form_id IN (SELECT form_id FROM badon_test.bf_forms) LIMIT 1`,
  );
  run(php, [cli, "crm:migrate"]);
  assert.equal(
    sql(
      `SELECT o.stage FROM badon_test.bf_opportunities o JOIN badon_test.leads l ON l.id=o.lead_id WHERE l.submission_hash='${cloneHash}'`,
    ).trim(),
    "follow_up",
  );
  // Member home uses only membership-scoped APIs; choosing an entrance is not authorization.
  const portalProject = await agency.req('flow-project-create', {workspace: wa, name: 'Projeto do portal', description: 'Detalhe interno não exposto pelo resumo', create_key: randomUUID()});
  assert.equal(portalProject.status, 200, JSON.stringify(portalProject.body));
  const portalOptions = await reader.req('task-options', undefined, {workspace: wa});
  assert.equal(portalOptions.status, 200);
  const visibleProject = portalOptions.body.projects.find(p => Number(p.id) === Number(portalProject.body.id));
  assert.deepEqual(Object.keys(visibleProject).sort(), ['id', 'name']);
  assert.equal((await reader.req('task-options', undefined, {workspace: wb, acesso: 'equipe'})).status, 403);
  assert.equal((await reader.req('task-list', undefined, {workspace: wb, today: '2027-01-05', acesso: 'equipe'})).status, 403);
  assert.equal((await reader.req('flow-clients', undefined, {acesso: 'equipe'})).status, 403);
  const portalTasks = await reader.req('task-list', undefined, {workspace: wa, today: '2027-01-05'});
  assert.equal(portalTasks.status, 200);
  const portalReader = (await reader.req('boot')).body.user;
  assert.ok(portalTasks.body.items.every(t => t.visibility === 'team' || t.creator === 'u:' + portalReader.id));
  // Calendar spans and narrow date updates preserve existing task data and authorization.
  const calendarCreated = await agency.req('task-create', {...task, workspace:wa, project_id:null, assignee:null, title:'Agenda QA · campanha', start_date:'2027-01-01', due_date:'2027-02-05',create_key:randomUUID()});
  assert.equal(calendarCreated.status,200,JSON.stringify(calendarCreated.body));
  const calendarId=calendarCreated.body.id;
  const calendarQuery={workspace:wa,calendar:'1',from:'2027-01-18',to:'2027-01-24'};
  const calendarItems=(await agency.req('flow-work',undefined,calendarQuery)).body.items;
  assert.ok(calendarItems.some(t=>Number(t.id)===calendarId));
  assert.ok(!calendarItems.some(t=>Number(t.id)===privateEditor.body.id));
  assert.equal((await reader.req('flow-work',undefined,calendarQuery)).status,403);
  assert.equal((await agency.req('flow-work',undefined,{...calendarQuery,to:'2028-01-01'})).status,422);
  assert.equal((await agency.req('flow-work',undefined,{...calendarQuery,from:'2027-02-30'})).status,422);
  const before=(await agency.req('task-item',undefined,{workspace:wa,id:calendarId})).body.item;
  const change={workspace:wa,id:calendarId,revision:before.revision,start_date:'2027-01-02',due_date:'2027-02-06'};
  assert.equal((await reader.req('task-reschedule',change)).status,403);
  assert.equal((await other.req('task-reschedule',change)).status,403);
  assert.equal((await agency.req('task-reschedule',{...change,id:privateEditor.body.id})).status,404);
  assert.equal((await agency.req('task-reschedule',{...change,revision:0})).status,409);
  assert.equal((await agency.req('task-reschedule',{...change,due_date:'2026-12-31'})).status,422);
  assert.equal((await agency.req('task-reschedule',{...change,due_date:null})).status,422);
  assert.equal((await agency.req('task-reschedule',change)).status,200);
  const after=(await agency.req('task-item',undefined,{workspace:wa,id:calendarId})).body.item;
  assert.equal(after.start_date,change.start_date);assert.equal(after.due_date,change.due_date);
  assert.equal(Number(after.revision),Number(before.revision)+1);
  for(const key of ['title','description','assignee','priority','extras','checklist','status','project_id']) assert.deepEqual(after[key],before[key],key);
  assert.equal((await agency.req('task-reschedule',change)).status,409);
  assert.equal((await agency.req('task-update',{...task,workspace:wa,id:calendarId,revision:after.revision,project_id:null,assignee:null,status:'done',start_date:after.start_date,due_date:after.due_date})).status,200);
  assert.ok(!(await agency.req('flow-work',undefined,{...calendarQuery,hide_done:'1'})).body.items.some(t=>Number(t.id)===calendarId));
  assert.equal((await agency.req('task-reschedule',{...change,revision:Number(after.revision)+1})).status,422);
  assert.equal(messages.length, mails);
  console.log(
    "OK: Bādon Flow, migração repetível sem perdas, clientes diretos/vinculados, projetos, subtarefas, isolamento, aprovação, pagamento manual idempotente e captura no follow-up.",
  );
}
