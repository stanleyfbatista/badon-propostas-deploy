<?php
declare(strict_types=1);

function crm_plus_ready(): bool {
    static $ready;
    return $ready ??= (int)db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('bf_crm_companies','bf_crm_contacts','bf_crm_details','bf_crm_activities','bf_crm_views')")->fetchColumn() === 5;
}
function crm_plus_key(array $in): string {
    $key=text_value($in['create_key']??'');
    if (!preg_match('/^[a-f0-9-]{36}$/D',$key)) throw new InvalidArgumentException('Atualize a página antes de criar o registro.');
    return $key;
}
function crm_plus_record(string $kind, int $id, int $workspace): ?array {
    if (!$id) return null;
    $table=$kind==='company'?'bf_crm_companies':'bf_crm_contacts';
    $q=db()->prepare("SELECT * FROM $table WHERE id=? AND workspace_id=?"); $q->execute([$id,$workspace]);
    $row=$q->fetch();
    if (!$row) throw new InvalidArgumentException('Selecione um cadastro deste espaço.');
    return $row;
}
function crm_plus_details(int $id): array {
    $q=db()->prepare('SELECT * FROM bf_crm_details WHERE opportunity_id=?'); $q->execute([$id]);
    return $q->fetch()?:['company_id'=>null,'contact_id'=>null,'service'=>'','expected_close'=>null,'loss_reason'=>''];
}
function crm_plus_save_details(int $id, int $workspace, array $in): void {
    $d=crm_plus_details($id);
    foreach (['company_id','contact_id','service','expected_close','loss_reason'] as $key) if (array_key_exists($key,$in)) $d[$key]=$in[$key];
    $company=crm_plus_record('company',(int)$d['company_id'],$workspace);
    $contact=crm_plus_record('contact',(int)$d['contact_id'],$workspace);
    if ($contact && (int)$contact['company_id']!==(int)($company['id']??0)) throw new InvalidArgumentException('O contato precisa pertencer à empresa selecionada.');
    $date=$d['expected_close']?:null;
    if ($date!==null) {
        if (!is_string($date)) throw new InvalidArgumentException('Previsão de fechamento inválida.');
        $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date);
        if (!$parsed || $parsed->format('Y-m-d')!==$date) throw new InvalidArgumentException('Previsão de fechamento inválida.');
    }
    db()->prepare('INSERT INTO bf_crm_details (opportunity_id,company_id,contact_id,service,expected_close,loss_reason) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE company_id=VALUES(company_id),contact_id=VALUES(contact_id),service=VALUES(service),expected_close=VALUES(expected_close),loss_reason=VALUES(loss_reason)')
        ->execute([$id,$company['id']??null,$contact['id']??null,studio_text($d['service'],150),$date,studio_text($d['loss_reason'],1000)]);
}
function crm_plus_filters(array $in): array {
    $out=[];
    foreach (['search'=>150,'stage'=>24,'assignee'=>32,'from'=>10,'to'=>10,'company_id'=>20,'contact_id'=>20,'focus'=>20,'sort'=>20,'mode'=>10] as $key=>$limit) $out[$key]=studio_text($in[$key]??'', $limit);
    if ($out['stage']!=='' && !isset(crm_stages()[$out['stage']])) throw new InvalidArgumentException('Etapa inválida.');
    foreach (['company_id','contact_id'] as $key) if ($out[$key]!=='' && !ctype_digit($out[$key])) throw new InvalidArgumentException('Filtro de cadastro inválido.');
    foreach (['from','to'] as $key) if ($out[$key]!=='' && (!($d=DateTimeImmutable::createFromFormat('!Y-m-d',$out[$key])) || $d->format('Y-m-d')!==$out[$key])) throw new InvalidArgumentException('Período inválido.');
    if ($out['from'] && $out['to'] && $out['from']>$out['to']) throw new InvalidArgumentException('O início do período deve vir antes do fim.');
    foreach (['focus'=>['','open','mine','overdue','untouched','unscheduled'],'sort'=>['','newest','amount','closing','activity'],'mode'=>['','kanban','list','agenda']] as $key=>$allowed) if (!in_array($out[$key],$allowed,true)) throw new InvalidArgumentException('Filtro inválido.');
    return $out;
}
function crm_plus_handle(string $action, array $u, array $in, int $workspace): void {
    if (!str_starts_with($action,'crm-plus-')) return;
    if (!crm_plus_ready()) studio_error(503,'A atualização do CRM ainda não foi ativada na hospedagem.');
    $actor=crm_actor($u);
    if ($action==='crm-plus-directory') {
        $kind=($_GET['kind']??'company')==='contact'?'contact':'company';
        $table=$kind==='company'?'bf_crm_companies':'bf_crm_contacts';
        $where=['r.workspace_id=?']; $args=[$workspace];
        $search=studio_text($_GET['search']??'',150);
        if ($search!=='') { $where[]='(r.name LIKE ? OR r.email LIKE ? OR r.phone LIKE ?)'; array_push($args,'%'.$search.'%','%'.$search.'%','%'.$search.'%'); }
        if (isset($_GET['id'])) { $where[]='r.id=?'; $args[]=(int)$_GET['id']; }
        if ($kind==='contact' && isset($_GET['company_id'])) { $where[]='COALESCE(r.company_id,0)=?'; $args[]=(int)$_GET['company_id']; }
        $filter=implode(' AND ',$where); $page=max(1,min(100000,(int)($_GET['page']??1)));
        $q=db()->prepare("SELECT COUNT(*) FROM $table r WHERE $filter"); $q->execute($args); $total=(int)$q->fetchColumn();
        $extra=$kind==='contact'?',c.name AS company_name':', (SELECT COUNT(*) FROM bf_crm_contacts c WHERE c.company_id=r.id AND c.workspace_id=r.workspace_id) AS contacts_count';
        $join=$kind==='contact'?' LEFT JOIN bf_crm_companies c ON c.id=r.company_id AND c.workspace_id=r.workspace_id':'';
        $q=db()->prepare("SELECT r.* $extra FROM $table r $join WHERE $filter ORDER BY r.name,r.id LIMIT 50 OFFSET ".(($page-1)*50)); $q->execute($args);
        studio_json(['items'=>$q->fetchAll(),'total'=>$total,'page'=>$page]);
    }
    if ($action==='crm-plus-directory-save') {
        $kind=($in['kind']??'company')==='contact'?'contact':'company';
        $table=$kind==='company'?'bf_crm_companies':'bf_crm_contacts'; $id=(int)($in['id']??0);
        $data=[];
        foreach (['name'=>150,'email'=>254,'phone'=>40,'notes'=>10000] as $key=>$max) $data[$key]=studio_text($in[$key]??'', $max,$key==='name');
        if ($data['email']!=='' && !filter_var($data['email'],FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Confira o e-mail.');
        if ($kind==='company') $data['document']=studio_text($in['document']??'',25);
        else {
            $company=crm_plus_record('company',(int)($in['company_id']??0),$workspace);
            $data['company_id']=$company['id']??null; $data['job_title']=studio_text($in['job_title']??'',150);
        }
        db()->beginTransaction();
        if ($id) {
            $q=db()->prepare("SELECT * FROM $table WHERE id=? AND workspace_id=? FOR UPDATE"); $q->execute([$id,$workspace]); $old=$q->fetch();
            if (!$old) studio_error(404,'Cadastro não encontrado.');
            if ((int)$old['revision']!==(int)($in['revision']??0)) studio_error(409,'O cadastro mudou. Feche e reabra para conferir.');
            if ($kind==='contact' && (int)$old['company_id']!==(int)$data['company_id']) {
                $q=db()->prepare('SELECT 1 FROM bf_crm_details WHERE contact_id=? LIMIT 1'); $q->execute([$id]);
                if ($q->fetchColumn()) throw new InvalidArgumentException('Este contato está vinculado a oportunidades. Desvincule-o delas antes de mudar a empresa.');
            }
            $q=db()->prepare("UPDATE $table SET ".implode(',',array_map(fn($k)=>"$k=?",array_keys($data))).',revision=revision+1,updated_at=? WHERE id=? AND workspace_id=?');
            $q->execute([...array_values($data),utc_now(),$id,$workspace]);
        } else {
            $key=crm_plus_key($in);
            $q=db()->prepare("INSERT INTO $table (workspace_id,create_key,".implode(',',array_keys($data)).',created_at,updated_at) VALUES ('.implode(',',array_fill(0,count($data)+4,'?')).') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)');
            $q->execute([$workspace,$key,...array_values($data),utc_now(),utc_now()]); $id=(int)db()->lastInsertId();
        }
        db()->commit(); studio_json(['id'=>$id]);
    }
    if ($action==='crm-plus-views') {
        $q=db()->prepare('SELECT id,name,filters_json FROM bf_crm_views WHERE workspace_id=? AND actor=? ORDER BY name'); $q->execute([$workspace,$actor]);
        studio_json(['items'=>array_map(fn($r)=>['id'=>$r['id'],'name'=>$r['name'],'filters'=>json_decode($r['filters_json'],true)],$q->fetchAll())]);
    }
    if ($action==='crm-plus-view-save') {
        $name=studio_text($in['name']??'',80,true);
        if (!is_array($in['filters']??null)) throw new InvalidArgumentException('Filtros inválidos.');
        $filters=crm_plus_filters($in['filters']);
        // Explicitly reject duplicates: no accidental overwriting of saved views.
        try { db()->prepare('INSERT INTO bf_crm_views (workspace_id,actor,name,filters_json) VALUES (?,?,?,?)')->execute([$workspace,$actor,$name,json_encode($filters,JSON_THROW_ON_ERROR)]); }
        catch (PDOException $e) { if ($e->getCode()==='23000') throw new InvalidArgumentException('Você já tem um filtro com este nome. Use outro nome.'); throw $e; }
        studio_json(['ok'=>true]);
    }
    if ($action==='crm-plus-view-delete') {
        db()->prepare('DELETE FROM bf_crm_views WHERE id=? AND workspace_id=? AND actor=?')->execute([(int)($in['id']??0),$workspace,$actor]);
        studio_json(['ok'=>true]);
    }
    if (in_array($action,['crm-plus-activity-add','crm-plus-activity-complete'],true)) {
        $id=(int)($in['id']??0); db()->beginTransaction();
        $q=db()->prepare('SELECT * FROM bf_opportunities WHERE id=? AND workspace_id=? FOR UPDATE'); $q->execute([$id,$workspace]); $item=$q->fetch();
        if (!$item) studio_error(404,'Oportunidade não encontrada.');
        $kinds=['call'=>'Ligação','meeting'=>'Reunião','email'=>'E-mail','task'=>'Tarefa','note'=>'Nota'];
        if ($action==='crm-plus-activity-add') {
            $key=crm_plus_key($in); $kind=text_value($in['kind']??'task');
            if (!isset($kinds[$kind])) throw new InvalidArgumentException('Tipo de atividade inválido.');
            $subject=studio_text($in['subject']??'',200,true); $body=studio_text($in['body']??'',4000);
            $done=($in['completed']??false)===true; $due=crm_date($in['due_at']??null);
            if (!$done && !$due) throw new InvalidArgumentException('Agende a atividade ou marque como já realizada.');
            $q=db()->prepare('INSERT INTO bf_crm_activities (opportunity_id,kind,subject,body,due_at,completed_at,actor,create_key,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)');
            $q->execute([$id,$kind,$subject,$body,$due,$done?utc_now():null,$actor,$key,utc_now()]);
            $changed=$q->rowCount()===1;
            if ($changed) crm_event($id,$actor,($done?'Registrado: ':'Agendado: ').$kinds[$kind].' — '.$subject);
        } else {
            $q=db()->prepare('SELECT * FROM bf_crm_activities WHERE id=? AND opportunity_id=? FOR UPDATE'); $q->execute([(int)($in['activity_id']??0),$id]); $activity=$q->fetch();
            if (!$activity) studio_error(404,'Atividade não encontrada.');
            $changed=$activity['completed_at']===null; $done=true; $kind=$activity['kind'];
            if ($changed) { db()->prepare('UPDATE bf_crm_activities SET completed_at=? WHERE id=?')->execute([utc_now(),$activity['id']]); crm_event($id,$actor,'Atividade concluída: '.$kinds[$kind].' — '.$activity['subject']); }
        }
        if ($changed) db()->prepare('UPDATE bf_opportunities SET revision=revision+1,updated_at=?'.($done && in_array($kind,['call','email','meeting'],true)?',last_contact_at=UTC_TIMESTAMP()':'').' WHERE id=?')->execute([utc_now(),$id]);
        db()->commit(); studio_json(['ok'=>true]);
    }
    studio_error(404,'Ação não encontrada.');
}
