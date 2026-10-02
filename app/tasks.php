<?php
declare(strict_types=1);
require_once __DIR__ . '/crm.php';

function tasks_ready(): bool
{
    return (int)db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('bf_tasks','bf_task_events')")->fetchColumn() === 2;
}
function tasks_dates_ready(): bool
{
    static $ready;
    if ($ready === null) $ready=(bool)db()->query("SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='bf_tasks' AND column_name='start_date'")->fetchColumn();
    return $ready;
}
function tasks_migrate(): void
{
    db()->exec(file_get_contents(__DIR__ . '/tasks-schema.sql'));
    if (!tasks_dates_ready()) db()->exec('ALTER TABLE bf_tasks ADD COLUMN start_date DATE NULL AFTER priority');
}
function tasks_date($raw): ?string
{
    if ($raw === null || $raw === '') return null;
    if (!is_string($raw)) throw new InvalidArgumentException('Prazo inválido.');
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $raw, new DateTimeZone('UTC'));
    if (!$d || $d->format('Y-m-d') !== $raw || $raw < '2000-01-01' || $raw > '2100-12-31') throw new InvalidArgumentException('Use uma data válida entre 2000 e 2100.');
    return $raw;
}
function tasks_event(int $id, string $actor, string $message): void
{
    db()->prepare('INSERT INTO bf_task_events (task_id,actor,message,created_at) VALUES (?,?,?,?)')->execute([$id,$actor,$message,utc_now()]);
}
function tasks_row(array $row): array
{
    $row['checklist'] = json_decode($row['checklist_json'],true,32,JSON_THROW_ON_ERROR);
    unset($row['checklist_json']);
    return $row;
}
function tasks_clean(array $in, array $u, int $workspace, ?array $old): array
{
    $actor = crm_actor($u); $creator = $old['creator'] ?? $actor;
    $data = ['title'=>studio_text($in['title']??'',200,true),'description'=>studio_text($in['description']??'',10000)];
    foreach (['status'=>['todo','doing','review','done'],'priority'=>['low','normal','high','urgent'],'visibility'=>['team','private']] as $key=>$allowed) {
        $data[$key] = text_value($in[$key]??($key==='priority'?'normal':$allowed[0]));
        if (!in_array($data[$key],$allowed,true)) throw new InvalidArgumentException('Estado, prioridade ou visibilidade inválidos.');
    }
    if ($old && $data['visibility'] !== $old['visibility'] && $actor !== $creator) throw new InvalidArgumentException('Somente quem criou a tarefa pode alterar sua visibilidade.');
    $data['assignee'] = text_value($in['assignee']??'') ?: null;
    if ($data['visibility'] === 'private') $data['assignee'] = $creator;
    if ($data['assignee'] && !in_array($data['assignee'],array_column(crm_people($workspace),'actor'),true)) throw new InvalidArgumentException('O responsável precisa ter acesso a este espaço.');
    $data['opportunity_id'] = null;
    if (!empty($in['opportunity_id'])) {
        $id = filter_var($in['opportunity_id'],FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        $q = db()->prepare('SELECT id FROM bf_opportunities WHERE id=? AND workspace_id=?'); $q->execute([$id ?: 0,$workspace]);
        if (!$q->fetchColumn()) throw new InvalidArgumentException('Escolha uma oportunidade deste espaço.');
        $data['opportunity_id'] = $id;
    }
    $data['due_date'] = tasks_date($in['due_date']??null);
    $start=tasks_date($in['start_date']??($old['start_date']??null));
    // Older clients omit the new field; explicit null clears it.
    if (array_key_exists('start_date',$in)) $start=tasks_date($in['start_date']);
    if ($start && $data['due_date'] && $start>$data['due_date']) throw new InvalidArgumentException('A data inicial não pode ser posterior ao vencimento.');
    if (tasks_dates_ready()) $data['start_date']=$start;
    elseif ($start) throw new InvalidArgumentException('Execute tasks:migrate no cPanel para ativar a data inicial.');
    $checklist = $in['checklist']??[];
    if (!is_array($checklist) || !array_is_list($checklist) || count($checklist)>50) throw new InvalidArgumentException('Use até 50 itens no checklist.');
    $clean = []; $ids = [];
    foreach ($checklist as $item) {
        if (!is_array($item) || !is_string($item['id']??null) || !preg_match('/^[a-f0-9-]{36}$/D',$item['id']) || isset($ids[$item['id']]) || !is_bool($item['done']??null)) throw new InvalidArgumentException('Checklist inválido.');
        $ids[$item['id']] = true;
        $clean[] = ['id'=>$item['id'],'text'=>studio_text($item['text']??'',300,true),'done'=>$item['done']];
    }
    $data['checklist_json'] = json_encode($clean,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    return $data;
}
function tasks_handle(string $action, array $u, array $in): never
{
    if (!crm_ready() || !tasks_ready()) studio_error(503,'Execute tasks:migrate no cPanel para ativar Tarefas e Meu dia.');
    $workspace=(int)($in['workspace']??$_GET['workspace']??0); $actor=crm_actor($u);
    $reads=['task-list','task-item','task-options','task-day'];
    studio_access($u,$workspace,in_array($action,$reads,true)?'read':'edit');
    // Private tasks are creator-only even for agency administrators. Workspace access is still required.
    $visibility="t.workspace_id=? AND (t.visibility='team' OR t.creator=?)";
    if ($action === 'task-options') {
        $search=studio_text($_GET['search']??'',150);
        $q=db()->prepare('SELECT id,name,company FROM bf_opportunities WHERE workspace_id=? AND (name LIKE ? OR company LIKE ?) ORDER BY id DESC LIMIT 30');
        $q->execute([$workspace,'%'.$search.'%','%'.$search.'%']);
        studio_json(['opportunities'=>$q->fetchAll()]);
    }
    if ($action === 'task-list') {
        $today=tasks_date($_GET['today']??null);
        if (!$today) throw new InvalidArgumentException('Informe o dia de referência.');
        $where=[$visibility,'t.archived=?']; $args=[$workspace,$actor,($_GET['archived']??'')==='1'?1:0];
        $search=studio_text($_GET['search']??'',200);
        if ($search!=='') { $where[]='(t.title LIKE ? OR t.description LIKE ?)'; $args[]='%'.$search.'%'; $args[]='%'.$search.'%'; }
        if (($_GET['mine']??'')==='1') { $where[]='t.assignee=?'; $args[]=$actor; }
        foreach (['status','priority','assignee'] as $key) if (!empty($_GET[$key])) { $where[]="t.$key=?"; $args[]=studio_text($_GET[$key],32); }
        if (($_GET['day']??'')==='1') {
            $where[]="t.status<>'done' AND (t.due_date<=? OR t.due_date IS NULL)"; $args[]=$today;
            if (tasks_dates_ready()) { $where[]='(t.start_date IS NULL OR t.start_date<=?)'; $args[]=$today; }
        }
        if (!empty($_GET['opportunity'])) { $where[]='t.opportunity_id=?'; $args[]=(int)$_GET['opportunity']; }
        $filter=implode(' AND ',$where);
        $q=db()->prepare("SELECT COUNT(*) AS total, COALESCE(SUM(t.status='done'),0) AS done, COALESCE(SUM(t.status<>'done' AND t.due_date<?),0) AS overdue, COALESCE(SUM(t.status<>'done' AND t.due_date=?),0) AS today FROM bf_tasks t WHERE $filter");
        $q->execute(array_merge([$today,$today],$args)); $metrics=$q->fetch();
        $page=max(1,min(100000,(int)($_GET['page']??1)));
        $q=db()->prepare("SELECT t.*,o.name AS opportunity_name,o.company AS opportunity_company FROM bf_tasks t LEFT JOIN bf_opportunities o ON o.id=t.opportunity_id AND o.workspace_id=t.workspace_id WHERE $filter ORDER BY (t.status='done'), (t.due_date IS NULL), t.due_date, FIELD(t.priority,'urgent','high','normal','low'), t.id DESC LIMIT 100 OFFSET ".(($page-1)*100));
        $q->execute($args);
        studio_json(['items'=>array_map('tasks_row',$q->fetchAll()),'metrics'=>$metrics,'page'=>$page,'people'=>crm_people($workspace),'stages'=>crm_stages(),'dates_ready'=>tasks_dates_ready()]);
    }
    if ($action === 'task-day') {
        $start=crm_date($_GET['start']??null); $end=crm_date($_GET['end']??null);
        if (!$start || !$end || $end<=$start || strtotime($end)-strtotime($start)>90000) throw new InvalidArgumentException('Período do dia inválido.');
        $q=db()->prepare("SELECT id,name,next_action,scheduled_at FROM bf_opportunities WHERE workspace_id=? AND assignee=? AND scheduled_at<? AND stage NOT IN ('won','disqualified','fake') ORDER BY scheduled_at LIMIT 20");
        $q->execute([$workspace,$actor,$end]); $appointments=$q->fetchAll();
        $q=db()->prepare("SELECT id,name,stage,last_contact_at FROM bf_opportunities WHERE workspace_id=? AND assignee=? AND stage NOT IN ('won','disqualified','fake') AND COALESCE(last_contact_at,created_at)<DATE_SUB(?,INTERVAL 7 DAY) ORDER BY COALESCE(last_contact_at,created_at) LIMIT 20");
        $q->execute([$workspace,$actor,$start]);
        studio_json(['appointments'=>$appointments,'attention'=>$q->fetchAll()]);
    }
    if ($action === 'task-create') {
        $data=tasks_clean($in,$u,$workspace,null); $key=text_value($in['create_key']??'');
        if (!preg_match('/^[a-f0-9-]{36}$/D',$key)) throw new InvalidArgumentException('Atualize a página antes de criar a tarefa.');
        $columns=array_keys($data); $now=utc_now();
        db()->beginTransaction();
        $q=db()->prepare('INSERT INTO bf_tasks (workspace_id,creator,create_key,'.implode(',',$columns).',completed_at,created_at,updated_at) VALUES (?,?,?,'.implode(',',array_fill(0,count($data),'?')).',?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)');
        $q->execute(array_merge([$workspace,$actor,$key],array_values($data),[$data['status']==='done'?$now:null,$now,$now]));
        $id=(int)db()->lastInsertId();
        if ($q->rowCount()===1) tasks_event($id,$actor,'Tarefa criada.');
        db()->commit(); studio_json(['id'=>$id]);
    }
    $id=(int)($in['id']??$_GET['id']??0);
    if ($action!=='task-item') db()->beginTransaction();
    $q=db()->prepare("SELECT t.* FROM bf_tasks t WHERE t.id=? AND $visibility".($action!=='task-item'?' FOR UPDATE':''));
    $q->execute([$id,$workspace,$actor]); $item=$q->fetch();
    if (!$item) { if (db()->inTransaction()) db()->rollBack(); studio_error(404,'Tarefa não encontrada.'); }
    if ($action==='task-item') {
        $q=db()->prepare('SELECT e.*,p.name AS actor_name FROM bf_task_events e LEFT JOIN bf_profiles p ON p.actor=e.actor WHERE task_id=? ORDER BY e.id DESC LIMIT 100'); $q->execute([$id]); $events=$q->fetchAll();
        $q=db()->prepare('SELECT name FROM bf_opportunities WHERE id=? AND workspace_id=?'); $q->execute([$item['opportunity_id'],$workspace]);
        $item['opportunity_name']=$q->fetchColumn()?:null;
        studio_json(['item'=>tasks_row($item),'events'=>$events,'dates_ready'=>tasks_dates_ready()]);
    }
    if ((int)($in['revision']??0)!==(int)$item['revision']) { db()->rollBack(); studio_error(409,'Esta tarefa mudou. Feche e reabra antes de salvar.'); }
    if ($action==='task-update') {
        if ($item['archived']) throw new InvalidArgumentException('Restaure a tarefa antes de editar.');
        $data=tasks_clean($in,$u,$workspace,$item);
        $data['completed_at']=$data['status']==='done'?($item['completed_at']?:utc_now()):null;
        $q=db()->prepare('UPDATE bf_tasks SET '.implode(',',array_map(fn($key)=>"$key=?",array_keys($data))).',revision=revision+1,updated_at=? WHERE id=?');
        $q->execute(array_merge(array_values($data),[utc_now(),$id]));
        $statuses=['todo'=>'A fazer','doing'=>'Em andamento','review'=>'Em aprovação','done'=>'Concluída'];
        tasks_event($id,$actor,$data['status']!==$item['status']?'Etapa: '.$statuses[$item['status']].' → '.$statuses[$data['status']]:'Tarefa e checklist atualizados.');
    } elseif ($action==='task-comment') {
        if ($item['archived']) throw new InvalidArgumentException('Restaure a tarefa antes de comentar.');
        tasks_event($id,$actor,studio_text($in['message']??'',2000,true));
        db()->prepare('UPDATE bf_tasks SET revision=revision+1,updated_at=? WHERE id=?')->execute([utc_now(),$id]);
    } elseif ($action==='task-archive') {
        if (!is_bool($in['archived']??null)) throw new InvalidArgumentException('Arquivo inválido.');
        db()->prepare('UPDATE bf_tasks SET archived=?,revision=revision+1,updated_at=? WHERE id=?')->execute([(int)$in['archived'],utc_now(),$id]);
        tasks_event($id,$actor,$in['archived']?'Tarefa arquivada.':'Tarefa restaurada.');
    } else { db()->rollBack(); studio_error(404,'Ação não encontrada.'); }
    db()->commit(); studio_json(['ok'=>true]);
}
