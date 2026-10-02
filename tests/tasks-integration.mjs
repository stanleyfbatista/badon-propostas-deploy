import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export async function tasksTests({
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
  Api,
}) {
  const mails = messages.length;
  assert.equal((await agency.req("boot")).body.tasks_ready, false);
  assert.equal(
    (
      await editor.req("task-list", undefined, {
        workspace: wa,
        today: "2027-01-05",
      })
    ).status,
    503,
  );
  run(php, [cli, "tasks:migrate"]);
  run(php, [cli, "tasks:migrate"]);
  assert.equal((await agency.req("boot")).body.tasks_ready, true);
  const actor = (await editor.req("boot")).body.profile.actor;
  const otherActor = (await other.req("boot")).body.profile.actor;
  const opp = (
    await editor.req("crm-create", {
      workspace: wa,
      create_key: randomUUID(),
      name: "Cliente para tarefa",
      stage: "qualified",
      amount: "0",
      assignee: actor,
      next_action: "Reunião",
      scheduled_at: "2027-01-05T15:00:00Z",
    })
  ).body.id;
  const foreign = (
    await other.req("crm-create", {
      workspace: wb,
      create_key: randomUUID(),
      name: "Outro cliente",
      stage: "new",
      amount: "0",
    })
  ).body.id;
  const base = {
    workspace: wa,
    title: "Preparar proposta",
    description: "Briefing",
    visibility: "team",
    assignee: actor,
    opportunity_id: opp,
    status: "todo",
    priority: "high",
    due_date: "2027-01-05",
    checklist: [{ id: randomUUID(), text: "Conferir orçamento", done: false }],
  };
  const create = async (data = {}) => {
    const payload = { ...base, create_key: randomUUID(), ...data };
    const result = await editor.req("task-create", payload);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return { id: result.body.id, payload };
  };
  const get = async (id, user = editor, w = wa) =>
    (await user.req("task-item", undefined, { workspace: w, id })).body;
  const list = async (query = {}, user = editor) =>
    (
      await user.req("task-list", undefined, {
        workspace: wa,
        today: "2027-01-05",
        ...query,
      })
    ).body;
  const created = await create();
  assert.equal(
    (await editor.req("task-create", created.payload)).body.id,
    created.id,
  );
  let detail = await get(created.id);
  assert.equal(detail.events.length, 1);
  assert.equal(detail.item.opportunity_name, "Cliente para tarefa");
  assert.equal(detail.item.checklist[0].done, false);
  assert.equal((await get(created.id, reader)).item.id, created.id);
  assert.equal(
    (
      await reader.req("task-update", {
        ...detail.item,
        workspace: wa,
        title: "Negado",
      })
    ).status,
    403,
  );
  assert.equal((await reader.req("task-create", created.payload)).status, 403);
  assert.equal(
    (await other.req("task-item", undefined, { workspace: wb, id: created.id }))
      .status,
    404,
  );
  assert.equal(
    (
      await other.req("task-list", undefined, {
        workspace: wa,
        today: "2027-01-05",
      })
    ).status,
    403,
  );
  const anon = new Api();
  await anon.req("boot");
  assert.equal(
    (
      await anon.req("task-list", undefined, {
        workspace: wa,
        today: "2027-01-05",
      })
    ).status,
    401,
  );
  assert.equal((await editor.req("task-create")).status, 405);
  const csrf = editor.csrf;
  editor.csrf = "wrong";
  assert.equal((await editor.req("task-create", created.payload)).status, 403);
  editor.csrf = csrf;
  for (const changes of [
    { opportunity_id: foreign },
    { assignee: otherActor },
    { status: "other" },
    { priority: "other" },
    { visibility: "public" },
    { title: "" },
    { due_date: "2027-02-30" },
    { checklist: [{ id: randomUUID(), text: "x", done: "false" }] },
    {
      checklist: Array.from({ length: 51 }, () => ({
        id: randomUUID(),
        text: "x",
        done: false,
      })),
    },
    { checklist: [base.checklist[0], base.checklist[0]] },
  ])
    assert.equal(
      (
        await editor.req("task-create", {
          ...created.payload,
          create_key: randomUUID(),
          ...changes,
        })
      ).status,
      422,
      JSON.stringify(changes),
    );
  const updated = {
    ...detail.item,
    workspace: wa,
    status: "doing",
    checklist: [{ ...base.checklist[0], done: true }],
  };
  assert.equal((await editor.req("task-update", updated)).status, 200);
  assert.equal((await editor.req("task-update", updated)).status, 409);
  detail = await get(created.id);
  assert.equal(detail.item.checklist[0].done, true);
  assert.match(detail.events[0].message, /Em andamento/);
  assert.equal(
    (
      await editor.req("task-comment", {
        workspace: wa,
        id: created.id,
        revision: detail.item.revision,
        message: "<script>não executar</script>",
      })
    ).status,
    200,
  );
  detail = await get(created.id);
  assert.equal(detail.events[0].message, "<script>não executar</script>");
  assert.equal(
    (
      await editor.req("task-update", {
        ...detail.item,
        workspace: wa,
        status: "done",
      })
    ).status,
    200,
  );
  detail = await get(created.id);
  assert.ok(detail.item.completed_at);
  assert.equal(
    (
      await editor.req("task-update", {
        ...detail.item,
        workspace: wa,
        status: "todo",
      })
    ).status,
    200,
  );
  detail = await get(created.id);
  assert.equal(detail.item.completed_at, null);
  assert.equal(
    (
      await agency.req("task-update", {
        ...detail.item,
        workspace: wa,
        visibility: "private",
      })
    ).status,
    422,
  );
  const privateTask = await create({
    title: "Particular",
    visibility: "private",
    assignee: null,
    creator: otherActor,
  });
  const privateDetail = await get(privateTask.id);
  assert.equal(privateDetail.item.creator, actor);
  assert.equal(privateDetail.item.assignee, actor);
  for (const user of [reader, agency]) {
    assert.equal(
      (
        await user.req("task-item", undefined, {
          workspace: wa,
          id: privateTask.id,
        })
      ).status,
      404,
    );
    assert.ok(
      !(await list({}, user)).items.some((t) => t.id === privateTask.id),
    );
  }
  assert.equal(
    (
      await agency.req("task-comment", {
        workspace: wa,
        id: privateTask.id,
        revision: 1,
        message: "intrusão",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await agency.req("task-archive", {
        workspace: wa,
        id: privateTask.id,
        revision: 1,
        archived: true,
      })
    ).status,
    404,
  );
  const past = await create({ title: "Atrasada", due_date: "2027-01-04" });
  const future = await create({ title: "Futura", due_date: "2027-01-06" });
  const noDate = await create({ title: "Sem prazo", due_date: null });
  const unassigned = await create({ title: "Sem responsável", assignee: null });
  const day = await list({ mine: 1, day: 1 });
  assert.ok(day.items.some((t) => t.id === past.id));
  assert.ok(day.items.some((t) => t.id === noDate.id));
  assert.ok(!day.items.some((t) => t.id === future.id));
  assert.ok(!day.items.some((t) => t.id === unassigned.id));
  assert.equal(Number(day.metrics.overdue), 1);
  assert.equal((await list({ search: "Futura" })).items.length, 1);
  const activity = (
    await editor.req("task-day", undefined, {
      workspace: wa,
      start: "2027-01-05T03:00:00Z",
      end: "2027-01-06T03:00:00Z",
    })
  ).body;
  assert.ok(activity.appointments.some((o) => o.id === opp));
  assert.ok(!activity.appointments.some((o) => o.id === foreign));
  assert.equal(
    (
      await reader.req("task-day", undefined, {
        workspace: wa,
        start: "2027-01-05T03:00:00Z",
        end: "2027-01-06T03:00:00Z",
      })
    ).body.appointments.length,
    0,
  );
  assert.equal(
    (
      await editor.req("task-day", undefined, {
        workspace: wa,
        start: "2027-01-05T03:00:00Z",
        end: "2027-02-06T03:00:00Z",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await editor.req("task-archive", {
        workspace: wa,
        id: created.id,
        revision: detail.item.revision,
        archived: true,
      })
    ).status,
    200,
  );
  assert.ok(!(await list()).items.some((t) => t.id === created.id));
  assert.ok(
    (await list({ archived: 1 })).items.some((t) => t.id === created.id),
  );
  detail = await get(created.id);
  assert.equal(
    (await editor.req("task-update", { ...detail.item, workspace: wa })).status,
    422,
  );
  assert.equal(
    (
      await editor.req("task-archive", {
        workspace: wa,
        id: created.id,
        revision: detail.item.revision,
        archived: false,
      })
    ).status,
    200,
  );
  assert.ok((await list()).items.some((t) => t.id === created.id));
  run(php, [cli, "tasks:migrate"]);
  assert.equal((await get(created.id)).item.title, "Preparar proposta");
  // Boundary: 100 records on page 1, remaining records on page 2, full filtered metrics.
  for (let n = 0; n < 102; n++)
    sql(
      "INSERT INTO badon_test.bf_tasks (workspace_id,creator,create_key,title,description,checklist_json,created_at,updated_at) VALUES (" +
        wa +
        ",'" +
        actor +
        "','" +
        randomUUID() +
        "','Lote " +
        n +
        "','','[]',UTC_TIMESTAMP(),UTC_TIMESTAMP())",
    );
  const first = await list({ search: "Lote " });
  assert.equal(first.items.length, 100);
  assert.equal(Number(first.metrics.total), 102);
  const second = await list({ search: "Lote ", page: 2 });
  assert.equal(second.items.length, 2);
  assert.ok(!second.items.some((t) => first.items.some((f) => f.id === t.id)));
  assert.equal(messages.length, mails);
  console.log(
    "OK: tarefas persistentes, migração repetível, particular até contra agência, papéis, CSRF, vínculos isolados, checklist, revisão, comentários, arquivo, Meu dia e paginação sem e-mail.",
  );
}
