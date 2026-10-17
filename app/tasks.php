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
    foreach (['project_id'=>'BIGINT UNSIGNED NULL','parent_id'=>'BIGINT UNSIGNED NULL','extras_json'=>'MEDIUMTEXT NULL'] as $column=>$type) {
        $q=db()->prepare("SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='bf_tasks' AND column_name=?"); $q->execute([$column]);
        if (!$q->fetchColumn()) db()->exec("ALTER TABLE bf_tasks ADD COLUMN $column $type");
    }
}
function tasks_extensions_ready(): bool {
    return (int)db()->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='bf_tasks' AND column_name IN ('project_id','parent_id','extras_json')")->fetchColumn()===3;
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
    $row['extras']=json_decode($row['extras_json']??'null',true)?:['tags'=>[],'links'=>[],'cover'=>''];
    unset($row['extras_json']);
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
    if (tasks_extensions_ready()) {
        $data['project_id']=!empty($in['project_id'])?(int)$in['project_id']:($old['project_id']??null);
        if (array_key_exists('project_id',$in) && !$in['project_id']) $data['project_id']=null;
        if ($data['project_id']) {
            if (!function_exists('flow_ready') || !flow_ready()) throw new InvalidArgumentException('Projetos ainda não ativados.');
            $q=db()->prepare('SELECT id FROM bf_flow_projects WHERE id=? AND workspace_id=?'); $q->execute([$data['project_id'],$workspace]);
            if (!$q->fetchColumn()) throw new InvalidArgumentException('Escolha um projeto deste cliente.');
        }
        $data['parent_id']=$old['parent_id']??(!empty($in['parent_id'])?(int)$in['parent_id']:null);
        if ($old && array_key_exists('parent_id',$in) && (int)$in['parent_id']!==(int)$old['parent_id']) throw new InvalidArgumentException('A tarefa-mãe não pode ser alterada após criar a subtarefa.');
        if ($data['parent_id']) {
            $q=db()->prepare('SELECT * FROM bf_tasks WHERE id=? AND workspace_id=? AND parent_id IS NULL AND archived=0 FOR UPDATE'); $q->execute([$data['parent_id'],$workspace]); $parent=$q->fetch();
            if (!$parent || ($parent['visibility']==='private' && $parent['creator']!==$actor)) throw new InvalidArgumentException('Tarefa-mãe indisponível.');
            if ($data['visibility']!==$parent['visibility'] || ($data['visibility']==='private' && $creator!==$parent['creator'])) throw new InvalidArgumentException('A subtarefa deve manter a visibilidade da tarefa-mãe.');
            $data['project_id']=$parent['project_id'];
        }
        if ($old && ($data['visibility']!==$old['visibility'] || (int)$data['project_id']!==(int)$old['project_id'])) {
            $q=db()->prepare('SELECT id FROM bf_tasks WHERE parent_id=? LIMIT 1'); $q->execute([$old['id']]);
            if ($q->fetchColumn()) throw new InvalidArgumentException('Uma tarefa com subtarefas deve manter seu projeto e sua visibilidade.');
        }
        $extra=$in['extras']??json_decode($old['extras_json']??'null',true)??[];
        if (!is_array($extra)) throw new InvalidArgumentException('Informações adicionais inválidas.');
        $tags=$extra['tags']??[]; $links=$extra['links']??[];
        if (!is_array($tags) || !array_is_list($tags) || count($tags)>20 || !is_array($links) || !array_is_list($links) || count($links)>50) throw new InvalidArgumentException('Use até 20 etiquetas e 50 links.');
        $safeLinks=[];
        foreach ($links as $link) {
            if (!is_array($link)) throw new InvalidArgumentException('Link inválido.');
            $safeLinks[]=['name'=>studio_text($link['name']??'',150,true),'url'=>flow_url($link['url']??'')];
        }
        $data['extras_json']=json_encode(['tags'=>array_values(array_unique(array_filter(array_map(fn($v)=>studio_text($v,40),$tags),fn($v)=>$v!==''))),'links'=>$safeLinks,'cover'=>flow_url($extra['cover']??'')],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    }
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
        $opportunities=$q->fetchAll(); $projects=[];
        if (function_exists('flow_ready') && flow_ready()) {
            $q=db()->prepare('SELECT id,name FROM bf_flow_projects WHERE workspace_id=? ORDER BY id DESC');$q->execute([$workspace]);$projects=$q->fetchAll();
        }
        studio_json(['opportunities'=>$opportunities,'projects'=>$projects,'extensions_ready'=>tasks_extensions_ready()]);
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
        if (tasks_extensions_ready() && !empty($_GET['project'])) { $where[]='t.project_id=?'; $args[]=(int)$_GET['project']; }
        $filter=implode(' AND ',$where);
        $q=db()->prepare("SELECT COUNT(*) AS total, COALESCE(SUM(t.status='done'),0) AS done, COALESCE(SUM(t.status<>'done' AND t.due_date<?),0) AS overdue, COALESCE(SUM(t.status<>'done' AND t.due_date=?),0) AS today FROM bf_tasks t WHERE $filter");
        $q->execute(array_merge([$today,$today],$args)); $metrics=$q->fetch();
        $page=max(1,min(100000,(int)($_GET['page']??1)));
        $q=db()->prepare("SELECT t.*,o.name AS opportunity_name,o.company AS opportunity_company FROM bf_tasks t LEFT JOIN bf_opportunities o ON o.id=t.opportunity_id AND o.workspace_id=t.workspace_id WHERE $filter ORDER BY (t.status='done'), (t.due_date IS NULL), t.due_date, FIELD(t.priority,'urgent','high','normal','low'), t.id DESC LIMIT 100 OFFSET ".(($page-1)*100));
        $q->execute($args);
        studio_json(['items'=>array_map('tasks_row',$q->fetchAll()),'metrics'=>$metrics,'page'=>$page,'people'=>crm_people($workspace),'stages'=>crm_stages(),'dates_ready'=>tasks_dates_ready(),'extensions_ready'=>tasks_extensions_ready()]);
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
        db()->beginTransaction();
        $data=tasks_clean($in,$u,$workspace,null); $key=text_value($in['create_key']??'');
        if (!preg_match('/^[a-f0-9-]{36}$/D',$key)) throw new InvalidArgumentException('Atualize a página antes de criar a tarefa.');
        $columns=array_keys($data); $now=utc_now();
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
        $children=[];
        if(tasks_extensions_ready()) {
            $q=db()->prepare("SELECT id,title,status,due_date FROM bf_tasks WHERE parent_id=? AND workspace_id=? AND (visibility='team' OR creator=?) ORDER BY id");
            $q->execute([$id,$workspace,$actor]);$children=$q->fetchAll();
        }
        studio_json(['item'=>tasks_row($item),'events'=>$events,'children'=>$children,'dates_ready'=>tasks_dates_ready(),'extensions_ready'=>tasks_extensions_ready()]);
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
        if ($in['archived'] && tasks_extensions_ready()) {
            $q=db()->prepare('SELECT id FROM bf_tasks WHERE parent_id=? AND archived=0 LIMIT 1');$q->execute([$id]);
            if ($q->fetchColumn()) throw new InvalidArgumentException('Arquive as subtarefas antes de arquivar a tarefa-mãe.');
        }
        db()->prepare('UPDATE bf_tasks SET archived=?,revision=revision+1,updated_at=? WHERE id=?')->execute([(int)$in['archived'],utc_now(),$id]);
        tasks_event($id,$actor,$in['archived']?'Tarefa arquivada.':'Tarefa restaurada.');
    } else { db()->rollBack(); studio_error(404,'Ação não encontrada.'); }
    db()->commit(); studio_json(['ok'=>true]);
}
