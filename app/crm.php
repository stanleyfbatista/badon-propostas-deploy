<?php
declare(strict_types=1);
require_once __DIR__ . '/studio.php';
require_once __DIR__ . '/crm-plus.php';

function crm_ready(): bool
{
    return (int)db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('bf_profiles','bf_opportunities','bf_crm_events')")->fetchColumn() === 3;
}
function crm_actor(array $u): string { return ($u['agency'] ? 'a:' : 'u:') . $u['id']; }
function crm_stages(): array
{
    return ['new' => 'Novo lead', 'qualified' => 'Qualificado', 'scheduled' => 'Agendado', 'no_show' => 'No show', 'negotiation' => 'Aperto de mão', 'follow_up' => 'Follow-up', 'won' => 'Fechado', 'disqualified' => 'Desqualificado', 'fake' => 'Lead falso'];
}
function crm_profile(array $u): array
{
    $actor = crm_actor($u);
    $q = db()->prepare('SELECT name, phone, appearance, avatar_version FROM bf_profiles WHERE actor = ?'); $q->execute([$actor]);
    $p = $q->fetch() ?: ['name' => '', 'phone' => '', 'appearance' => 'light', 'avatar_version' => null];
    return $p + ['actor' => $actor, 'email' => $u['email'], 'avatar_url' => $p['avatar_version'] ? '/api/profile-photo.php?actor=' . rawurlencode($actor) . '&v=' . $p['avatar_version'] : null];
}
function crm_people(int $workspace): array
{
    $q = db()->prepare("SELECT CONCAT('a:', id) AS actor, email FROM admins UNION ALL SELECT CONCAT('u:', u.id) AS actor, u.email FROM bf_users u JOIN bf_members m ON m.user_id=u.id WHERE m.workspace_id=?");
    $q->execute([$workspace]); $people = $q->fetchAll();
    $profile = db()->prepare('SELECT name, avatar_version FROM bf_profiles WHERE actor=?');
    foreach ($people as &$person) {
        $profile->execute([$person['actor']]); $p = $profile->fetch();
        $person['name'] = $p['name'] ?? '';
        $person['avatar_url'] = !empty($p['avatar_version']) ? '/api/profile-photo.php?actor=' . rawurlencode($person['actor']) . '&v=' . $p['avatar_version'] : null;
    }
    return $people;
}
function crm_event(int $id, ?string $actor, string $message): void
{
    db()->prepare('INSERT INTO bf_crm_events (opportunity_id, actor, message, created_at) VALUES (?, ?, ?, ?)')->execute([$id, $actor, $message, utc_now()]);
}
function crm_capture(int $leadId): void
{
    $q = db()->prepare('SELECT l.*, b.workspace_id, f.fields_json FROM leads l JOIN bf_forms b ON b.form_id=l.form_id JOIN forms f ON f.id=l.form_id WHERE l.id=?'); $q->execute([$leadId]); $lead = $q->fetch();
    if (!$lead) return;
    $values = array_column(json_decode($lead['values_json'], true), 'value', 'key');
    $name = ''; $phone = '';
    foreach (form_definition($lead['fields_json'])['fields'] as $field) {
        $value = (string)($values[$field['key']] ?? '');
        if ($field['type'] === 'name' && $name === '') $name = mb_substr($value, 0, 150);
        if ($field['type'] === 'tel' && $phone === '') $phone = mb_substr($value, 0, 40);
    }
    $q = db()->prepare("INSERT INTO bf_opportunities (workspace_id, lead_id, name, email, phone, source, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)");
    $q->execute([$lead['workspace_id'], $leadId, $name ?: 'Contato #' . $leadId, $lead['reply_email'] ?? '', $phone, mb_substr($lead['form_title'], 0, 150), $lead['created_at'], $lead['created_at']]);
    // Idempotency: one opportunity per confirmed response, never reset an existing stage.
    if ($q->rowCount() === 1) {
        $opportunity=(int)db()->lastInsertId();
        $flow=(bool)db()->query("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='bf_flow_sales'")->fetchColumn();
        if ($flow) db()->prepare("UPDATE bf_opportunities SET stage='follow_up' WHERE id=?")->execute([$opportunity]);
        crm_event($opportunity, null, $flow ? 'Resposta recebida pelo funil. Entrada automática no CRM de follow-up.' : 'Resposta recebida pelo formulário.');
    }
}
function crm_migrate(): void
{
    db()->exec(file_get_contents(__DIR__ . '/crm-schema.sql'));
    db()->exec(file_get_contents(__DIR__ . '/crm-plus-schema.sql'));
    $last = 0;
    do {
        $q = db()->prepare('SELECT l.id FROM leads l JOIN bf_forms f ON f.form_id=l.form_id LEFT JOIN bf_opportunities o ON o.lead_id=l.id WHERE l.id>? AND o.id IS NULL ORDER BY l.id LIMIT 250'); $q->execute([$last]); $ids = $q->fetchAll(PDO::FETCH_COLUMN);
        foreach ($ids as $id) {
            db()->beginTransaction();
            try { crm_capture((int)$id); db()->commit(); }
            catch (Throwable $e) { db()->rollBack(); throw $e; }
            $last = (int)$id;
        }
    } while (count($ids) === 250);
}
function crm_date($raw): ?string
{
    if ($raw === null || $raw === '') return null;
    if (!is_string($raw)) throw new InvalidArgumentException('Data inválida.');
    $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $raw, new DateTimeZone('UTC'));
    if (!$date || $date->format('Y-m-d\TH:i:s\Z') !== $raw) throw new InvalidArgumentException('Data inválida.');
    return $date->format('Y-m-d H:i:s');
}
function crm_clean(array $in, int $workspace): array
{
    $row = [];
    foreach (['name'=>150, 'company'=>150, 'document'=>25, 'email'=>254, 'phone'=>40, 'source'=>150, 'notes'=>10000, 'next_action'=>200] as $key=>$max) $row[$key] = studio_text($in[$key] ?? '', $max, $key === 'name');
    if ($row['email'] !== '' && !filter_var($row['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Confira o e-mail.');
    $row['stage'] = text_value($in['stage'] ?? 'new');
    if (!isset(crm_stages()[$row['stage']])) throw new InvalidArgumentException('Etapa inválida.');
    $row['assignee'] = text_value($in['assignee'] ?? '') ?: null;
    if ($row['assignee'] && !in_array($row['assignee'], array_column(crm_people($workspace), 'actor'), true)) throw new InvalidArgumentException('O responsável precisa ter acesso a este espaço.');
    $amount = (string)($in['amount'] ?? '0');
    if (!preg_match('/^\d{1,11}(?:\.\d{1,2})?$/D', $amount)) throw new InvalidArgumentException('Valor: use um número positivo com até duas casas decimais.');
    $row['amount'] = $amount;
    $row['scheduled_at'] = crm_date($in['scheduled_at'] ?? null);
    if ($row['scheduled_at'] && !$row['next_action']) throw new InvalidArgumentException('Descreva a atividade agendada.');
    return $row;
}
function crm_handle(string $action, array $u, array $in): never
{
    if (!crm_ready()) studio_error(503, 'CRM e perfis precisam da atualização crm:migrate no cPanel. Os formulários continuam funcionando.');
    if ($action === 'profile') studio_json(['profile' => crm_profile($u)]);
    if ($action === 'profile-save') {
        $name = studio_text($in['name'] ?? '', 150, true); $phone = studio_text($in['phone'] ?? '', 40);
        $appearance = $in['appearance'] ?? 'light';
        if (!in_array($appearance, ['light','dark'], true)) throw new InvalidArgumentException('Tema inválido.');
        db()->prepare('INSERT INTO bf_profiles (actor,name,phone,appearance) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),phone=VALUES(phone),appearance=VALUES(appearance)')->execute([crm_actor($u),$name,$phone,$appearance]);
        studio_json(['profile'=>crm_profile($u)]);
    }
    if ($action === 'profile-password') {
        if (!rate_allowed('profile-password', crm_actor($u), 5, 900)) studio_error(429, 'Aguarde antes de tentar novamente.');
        $table = $u['agency'] ? 'admins' : 'bf_users';
        $q = db()->prepare("SELECT * FROM $table WHERE id=?"); $q->execute([$u['id']]); $user = $q->fetch();
        if (!is_string($in['current'] ?? null) || !password_verify($in['current'], $user['password_hash'])) throw new InvalidArgumentException('Senha atual incorreta.');
        $password = $in['password'] ?? null;
        if (!is_string($password) || strlen($password)<12 || strlen($password)>72) throw new InvalidArgumentException('Use uma senha com 12 a 72 bytes.');
        $user['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
        db()->prepare("UPDATE $table SET password_hash=? WHERE id=?")->execute([$user['password_hash'],$u['id']]);
        studio_login($user, $u['agency']); studio_json(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    $workspace = (int)($in['workspace'] ?? $_GET['workspace'] ?? 0);
    studio_access($u, $workspace, in_array($action, ['crm-list','crm-item','crm-plus-directory','crm-plus-views','crm-plus-view-save','crm-plus-view-delete'], true) ? 'read' : 'edit');
    crm_plus_handle($action,$u,$in,$workspace);
    if ($action === 'crm-list') {
        $where = ['o.workspace_id=?']; $args = [$workspace];
        $search = studio_text($_GET['search'] ?? '', 150);
        if ($search !== '') { $where[] = '(o.name LIKE ? OR o.company LIKE ? OR o.email LIKE ? OR o.phone LIKE ?)'; for ($i=0;$i<4;$i++) $args[]='%'.$search.'%'; }
        foreach (['stage','assignee'] as $key) if (!empty($_GET[$key])) { $where[]="o.$key=?"; $args[]=studio_text($_GET[$key], 32); }
        foreach (['from'=>'>=', 'to'=>'<='] as $key=>$operator) if (!empty($_GET[$key])) { $where[]="o.created_at $operator ?"; $args[]=crm_date($_GET[$key]); }
        $agenda = ($_GET['agenda'] ?? '') === '1';
        if ($agenda) $where[]='o.scheduled_at IS NOT NULL';
        $plus=crm_plus_ready();
        $extra=''; $join='';
        if ($plus) {
            $join=' LEFT JOIN bf_crm_details d ON d.opportunity_id=o.id';
            $extra=',d.company_id,d.contact_id,d.service,d.expected_close,d.loss_reason,(SELECT MIN(a.due_at) FROM bf_crm_activities a WHERE a.opportunity_id=o.id AND a.completed_at IS NULL) AS followup_due,(SELECT COUNT(*) FROM bf_crm_activities a WHERE a.opportunity_id=o.id AND a.completed_at IS NULL) AS pending_activities';
            foreach (['company_id','contact_id'] as $key) if (!empty($_GET[$key])) { $where[]="d.$key=?"; $args[]=(int)$_GET[$key]; }
            $active="o.stage NOT IN ('won','disqualified','fake')";
            $overdue='(o.scheduled_at<UTC_TIMESTAMP() OR EXISTS (SELECT 1 FROM bf_crm_activities a WHERE a.opportunity_id=o.id AND a.completed_at IS NULL AND a.due_at<UTC_TIMESTAMP()))';
            $focus=$_GET['focus']??'';
            if ($focus==='open') $where[]=$active;
            if ($focus==='mine') { $where[]='o.assignee=?'; $args[]=crm_actor($u); }
            if ($focus==='overdue') $where[]="$active AND $overdue";
            if ($focus==='untouched') $where[]="$active AND COALESCE(o.last_contact_at,o.created_at)<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY)";
            if ($focus==='unscheduled') $where[]="$active AND o.scheduled_at IS NULL AND NOT EXISTS (SELECT 1 FROM bf_crm_activities a WHERE a.opportunity_id=o.id AND a.completed_at IS NULL)";
            if ($agenda) { array_splice($where,array_search('o.scheduled_at IS NOT NULL',$where,true),1); $where[]='(o.scheduled_at IS NOT NULL OR EXISTS (SELECT 1 FROM bf_crm_activities a WHERE a.opportunity_id=o.id AND a.completed_at IS NULL))'; }
        }
        $filter = implode(' AND ', $where);
        $dueExpression=$plus?"$active AND $overdue":"o.scheduled_at<UTC_TIMESTAMP()";
        $q=db()->prepare("SELECT COUNT(*) AS total, COALESCE(SUM(o.amount),0) AS amount, COALESCE(SUM(o.stage='won'),0) AS won, COALESCE(SUM($dueExpression),0) AS overdue, COALESCE(SUM(COALESCE(o.last_contact_at,o.created_at)<DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY) AND o.stage NOT IN ('won','disqualified','fake')),0) AS untouched FROM bf_opportunities o $join WHERE $filter"); $q->execute($args); $metrics=$q->fetch();
        $page=max(1,(int)($_GET['page']??1));
        $sort=$_GET['sort']??'';
        $order=$sort==='amount'?'o.amount DESC,o.id DESC':($sort==='closing' && $plus?'d.expected_close IS NULL,d.expected_close,o.id DESC':'o.id DESC');
        if ($agenda || $sort==='activity') $order=$plus?"LEAST(COALESCE(o.scheduled_at,'9999-12-31'),COALESCE(followup_due,'9999-12-31')),o.id DESC":'o.scheduled_at IS NULL,o.scheduled_at,o.id DESC';
        $q=db()->prepare("SELECT o.*, l.form_title $extra FROM bf_opportunities o LEFT JOIN leads l ON l.id=o.lead_id $join WHERE $filter ORDER BY $order LIMIT 100 OFFSET " . (($page-1)*100)); $q->execute($args);
        $groups=db()->prepare("SELECT o.stage,COUNT(*) AS total FROM bf_opportunities o $join WHERE $filter GROUP BY o.stage"); $groups->execute($args);
        studio_json(['items'=>$q->fetchAll(),'metrics'=>$metrics,'counts'=>$groups->fetchAll(),'people'=>crm_people($workspace),'stages'=>crm_stages(),'page'=>$page,'plus_ready'=>$plus]);
    }
    if ($action === 'crm-create') {
        $data=crm_clean($in,$workspace); $key=text_value($in['create_key']??'');
        if (!preg_match('/^[a-f0-9-]{36}$/D',$key)) throw new InvalidArgumentException('Atualize a página antes de criar a oportunidade.');
        db()->beginTransaction();
        $columns=array_keys($data);
        $q=db()->prepare('INSERT INTO bf_opportunities (workspace_id,create_key,'.implode(',',$columns).',created_at,updated_at) VALUES (?,?,' . implode(',',array_fill(0,count($data),'?')) . ',?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)');
        $q->execute(array_merge([$workspace,$key],array_values($data),[utc_now(),utc_now()])); $id=(int)db()->lastInsertId();
        if ($q->rowCount()===1) {
            if (crm_plus_ready()) crm_plus_save_details($id,$workspace,$in);
            crm_event($id,crm_actor($u),'Oportunidade criada manualmente.');
        }
        db()->commit(); studio_json(['id'=>$id]);
    }
    $id=(int)($in['id']??$_GET['id']??0);
    if ($action !== 'crm-item') db()->beginTransaction();
    $q=db()->prepare('SELECT * FROM bf_opportunities WHERE id=? AND workspace_id=?' . ($action !== 'crm-item' ? ' FOR UPDATE' : '')); $q->execute([$id,$workspace]); $item=$q->fetch();
    if (!$item) { if (db()->inTransaction()) db()->rollBack(); studio_error(404,'Oportunidade não encontrada.'); }
    if ($action === 'crm-item') {
        $q=db()->prepare('SELECT e.*,p.name AS actor_name FROM bf_crm_events e LEFT JOIN bf_profiles p ON p.actor=e.actor WHERE opportunity_id=? ORDER BY e.id DESC LIMIT 100'); $q->execute([$id]); $events=$q->fetchAll();
        $q=db()->prepare('SELECT values_json,form_title,created_at FROM leads WHERE id=?'); $q->execute([$item['lead_id']]); $lead=$q->fetch();
        $activities=[]; $linked=[];
        if (crm_plus_ready()) {
            $item+=crm_plus_details($id);
            $linked=['company'=>crm_plus_record('company',(int)$item['company_id'],$workspace),'contact'=>crm_plus_record('contact',(int)$item['contact_id'],$workspace)];
            $q=db()->prepare('SELECT * FROM bf_crm_activities WHERE opportunity_id=? ORDER BY completed_at IS NOT NULL,due_at IS NULL,due_at,id DESC LIMIT 200'); $q->execute([$id]); $activities=$q->fetchAll();
        }
        studio_json(['item'=>$item,'events'=>$events,'answers'=>$lead?json_decode($lead['values_json'],true):[],'plus_ready'=>crm_plus_ready(),'activities'=>$activities,'linked'=>$linked]);
    }
    if ((int)($in['revision']??0)!==(int)$item['revision']) { db()->rollBack(); studio_error(409,'Esta oportunidade mudou. Feche e reabra antes de salvar.'); }
    if ($action === 'crm-update') {
        $data=crm_clean($in,$workspace);
        if (crm_plus_ready()) crm_plus_save_details($id,$workspace,$in);
        $q=db()->prepare('UPDATE bf_opportunities SET '.implode(',',array_map(fn($key)=>"$key=?",array_keys($data))).',revision=revision+1,updated_at=? WHERE id=?'); $q->execute(array_merge(array_values($data),[utc_now(),$id]));
        crm_event($id,crm_actor($u), $data['stage']!==$item['stage'] ? 'Etapa: '.crm_stages()[$item['stage']].' → '.crm_stages()[$data['stage']] : 'Dados da oportunidade atualizados.');
    } elseif ($action === 'crm-note') {
        crm_event($id,crm_actor($u),studio_text($in['message']??'',2000,true));
        db()->prepare('UPDATE bf_opportunities SET revision=revision+1,updated_at=? WHERE id=?')->execute([utc_now(),$id]);
    } elseif ($action === 'crm-contact' || $action === 'crm-complete') {
        db()->prepare('UPDATE bf_opportunities SET last_contact_at=?,revision=revision+1,updated_at=?'.($action==='crm-complete' ? ",scheduled_at=NULL,next_action=''" : '').' WHERE id=?')->execute([utc_now(),utc_now(),$id]);
        crm_event($id,crm_actor($u),$action==='crm-complete' ? 'Atividade concluída: '.$item['next_action'] : 'Contato realizado.');
    } else { db()->rollBack(); studio_error(404,'Ação não encontrada.'); }
    db()->commit(); studio_json(['ok'=>true]);
}
