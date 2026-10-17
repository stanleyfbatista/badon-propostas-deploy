<?php
declare(strict_types=1);
require_once __DIR__ . '/tasks.php';

function flow_ready(): bool {
    return (int)db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('bf_flow_clients','bf_flow_sales','bf_flow_projects','bf_flow_files')")->fetchColumn() === 4;
}
function flow_migrate(): void {
    db()->exec(file_get_contents(__DIR__.'/flow-schema.sql'));
    // Existing spaces are not silently reclassified as paying clients.
}
function flow_key($value): string {
    if (!is_string($value) || !preg_match('/^[a-f0-9-]{36}$/D',$value)) throw new InvalidArgumentException('Atualize a página e tente novamente.');
    return $value;
}
function flow_url($value): string {
    $url=studio_text($value,2000);
    if (preg_match('~^/api/flow-file\.php\?id=[1-9][0-9]*$~D',$url)) return $url;
    if ($url!=='' && (!filter_var($url,FILTER_VALIDATE_URL) || strtolower((string)parse_url($url,PHP_URL_SCHEME))!=='https' || parse_url($url,PHP_URL_USER) || parse_url($url,PHP_URL_PASS))) throw new InvalidArgumentException('Use um link HTTPS completo, sem credenciais.');
    return $url;
}
function flow_clean_client(array $in): array {
    $r=[];
    foreach (['contact'=>150,'email'=>254,'phone'=>40,'document'=>25] as $key=>$limit) $r[$key]=studio_text($in[$key]??'',$limit);
    $r['email']=strtolower($r['email']);
    $r['document']=preg_replace('/[^0-9a-zA-Z]/','',$r['document']);
    $r['email_key']=$r['email']?:null;
    $r['document_key']=$r['document']?strtoupper($r['document']):null;
    if ($r['email']!=='' && !filter_var($r['email'],FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Confira o e-mail.');
    if (!is_bool($in['active']??null)) throw new InvalidArgumentException('Situação do cliente inválida.');
    $r['active']=(int)$in['active'];
    $d=$in['details']??[];
    if (!is_array($d)) throw new InvalidArgumentException('Dados do cliente inválidos.');
    $clean=[];
    foreach (['segment'=>150,'description'=>4000,'briefing'=>12000,'brand'=>12000,'owner'=>150,'contract_notes'=>4000] as $key=>$limit) $clean[$key]=studio_text($d[$key]??'',$limit);
    foreach (['photo','cover','contract_url'] as $key) $clean[$key]=flow_url($d[$key]??'');
    $clean['color']=text_value($d['color']??'#0053c3');
    if (!preg_match('/^#[a-fA-F0-9]{6}$/D',$clean['color'])) throw new InvalidArgumentException('Cor inválida.');
    $clean['contract_status']=$d['contract_status']??'none';
    if (!in_array($clean['contract_status'],['none','draft','signed','closed'],true)) throw new InvalidArgumentException('Contrato inválido.');
    $clean['contract_start']=tasks_date($d['contract_start']??null);
    $clean['contract_end']=tasks_date($d['contract_end']??null);
    if ($clean['contract_start'] && $clean['contract_end'] && $clean['contract_start']>$clean['contract_end']) throw new InvalidArgumentException('O término do contrato deve ser posterior ao início.');
    $clean['notice_days']=filter_var($d['notice_days']??30,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>365]]);
    if ($clean['notice_days']===false) throw new InvalidArgumentException('Use de 1 a 365 dias para o aviso.');
    $resources=$d['resources']??[];
    if (!is_array($resources) || !array_is_list($resources) || count($resources)>100) throw new InvalidArgumentException('Use até 100 materiais por cliente.');
    $clean['resources']=[];
    foreach ($resources as $v) {
        if (!is_array($v)) throw new InvalidArgumentException('Material inválido.');
        $category=$v['category']??'documents';
        if (!in_array($category,['documents','brand','briefing','contract'],true)) throw new InvalidArgumentException('Categoria inválida.');
        $url=flow_url($v['url']??'');
        if (!$url) throw new InvalidArgumentException('Informe o link do material.');
        $clean['resources'][]=['name'=>studio_text($v['name']??'',150,true),'url'=>$url,'category'=>$category];
    }
    $r['details_json']=json_encode($clean,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    return $r;
}
function flow_client_row(array $r): array {
    $r['details']=json_decode($r['details_json'],true,32,JSON_THROW_ON_ERROR);
    $r['active']=(bool)$r['active'];
    unset($r['details_json'],$r['create_key']);
    return $r;
}
function flow_insert_client(string $name, array $data, ?string $key=null, int $existing=0): int {
    $id=$existing;
    if ($id) {
        $q=db()->prepare('SELECT id FROM bf_workspaces WHERE id=? FOR UPDATE'); $q->execute([$id]);
        if (!$q->fetchColumn()) throw new InvalidArgumentException('Espaço não encontrado.');
        $q=db()->prepare('SELECT workspace_id FROM bf_flow_clients WHERE workspace_id=?'); $q->execute([$id]);
        if ($q->fetchColumn()) throw new InvalidArgumentException('Este espaço já possui cadastro de cliente.');
    } else {
        db()->prepare('INSERT INTO bf_workspaces (name,slug) VALUES (?,?)')->execute([$name,'cliente-'.bin2hex(random_bytes(10))]);
        $id=(int)db()->lastInsertId();
    }
    $keys=array_keys($data);
    db()->prepare('INSERT INTO bf_flow_clients (workspace_id,create_key,'.implode(',',$keys).',created_at,updated_at) VALUES (?,?,' . implode(',',array_fill(0,count($data),'?')).',?,?)')->execute(array_merge([$id,$key],array_values($data),[utc_now(),utc_now()]));
    return $id;
}
function flow_duplicate(array $data,int $exclude=0): bool {
    $q=db()->prepare("SELECT workspace_id FROM bf_flow_clients WHERE workspace_id<>? AND (document_key=? OR email_key=?) LIMIT 1");
    $q->execute([$exclude,$data['document_key'],$data['email_key']]);
    return (bool)$q->fetchColumn();
}
function flow_sale_identity(array $o): string {
    return hash('sha256',json_encode(array_intersect_key($o,array_flip(['name','company','document','email','phone'])),JSON_THROW_ON_ERROR));
}
function flow_handle(string $action,array $u,array $in): never {
    // The commercial/client dossier is agency-private. Membership of a client
    // space never grants access to contracts, other clients or agency CRM.
    if (!$u['agency']) studio_error(403,'Esta área comercial é exclusiva da agência.');
    if (!flow_ready()) studio_error(503,'Execute flow:migrate no cPanel para ativar a unificação. Dados anteriores preservados.');
    if ($action==='flow-clients') {
        $q=db()->query('SELECT c.*,w.name FROM bf_flow_clients c JOIN bf_workspaces w ON w.id=c.workspace_id ORDER BY w.name');
        studio_json(['items'=>array_map('flow_client_row',$q->fetchAll()),'spaces'=>db()->query('SELECT w.id,w.name FROM bf_workspaces w LEFT JOIN bf_flow_clients c ON c.workspace_id=w.id WHERE c.workspace_id IS NULL ORDER BY w.name')->fetchAll()]);
    }
    if ($action==='flow-client-create') {
        $key=flow_key($in['create_key']??null);
        $name=studio_text($in['name']??'',150,true); $data=flow_clean_client($in);
        db()->beginTransaction();
        $q=db()->prepare('SELECT workspace_id FROM bf_flow_clients WHERE create_key=?'); $q->execute([$key]);
        if ($id=$q->fetchColumn()) { db()->commit(); studio_json(['id'=>(int)$id]); }
        if (flow_duplicate($data)) throw new InvalidArgumentException('Já existe um cliente com este documento ou e-mail. Abra o cadastro existente.');
        $id=flow_insert_client($name,$data,$key,(int)($in['existing_workspace']??0));
        db()->commit(); studio_json(['id'=>$id]);
    }
    if ($action==='flow-client-save') {
        $id=(int)($in['id']??0); $data=flow_clean_client($in); $name=studio_text($in['name']??'',150,true);
        db()->beginTransaction();
        $q=db()->prepare('SELECT revision FROM bf_flow_clients WHERE workspace_id=? FOR UPDATE'); $q->execute([$id]); $rev=$q->fetchColumn();
        if (!$rev) studio_error(404,'Cliente não encontrado.');
        if ((int)$rev!==(int)($in['revision']??0)) studio_error(409,'Este cliente mudou. Reabra o perfil antes de salvar.');
        if (flow_duplicate($data,$id)) throw new InvalidArgumentException('Documento ou e-mail já vinculado a outro cliente.');
        db()->prepare('UPDATE bf_flow_clients SET '.implode(',',array_map(fn($k)=>"$k=?",array_keys($data))).',revision=revision+1,updated_at=? WHERE workspace_id=?')->execute(array_merge(array_values($data),[utc_now(),$id]));
        db()->prepare('UPDATE bf_workspaces SET name=? WHERE id=?')->execute([$name,$id]);
        db()->commit(); studio_json(['ok'=>true]);
    }
    if ($action==='flow-client-history') {
        $id=(int)($_GET['id']??0);
        $q=db()->prepare('SELECT s.*,o.name,o.company,o.amount,o.source,o.notes,o.workspace_id AS source_workspace,o.lead_id FROM bf_flow_sales s JOIN bf_opportunities o ON o.id=s.opportunity_id WHERE s.client_workspace_id=? ORDER BY s.created_at DESC'); $q->execute([$id]); $sales=$q->fetchAll();
        foreach ($sales as &$sale) {
            $q=db()->prepare('SELECT message,actor,created_at FROM bf_crm_events WHERE opportunity_id=? ORDER BY id DESC LIMIT 100'); $q->execute([$sale['opportunity_id']]); $sale['events']=$q->fetchAll();
            $q=db()->prepare('SELECT values_json FROM leads WHERE id=?'); $q->execute([$sale['lead_id']]); $v=$q->fetchColumn(); $sale['answers']=$v?json_decode($v,true):[];
        }
        studio_json(['sales'=>$sales]);
    }
    if ($action==='flow-overview') {
        $today=tasks_date($_GET['today']??null);
        if (!$today) throw new InvalidArgumentException('Informe o dia de referência.');
        $end=(new DateTimeImmutable($today))->modify('+3 days')->format('Y-m-d');
        $q=db()->prepare("SELECT t.id,t.title,t.workspace_id,t.project_id,t.due_date,t.status,w.name AS client FROM bf_tasks t JOIN bf_workspaces w ON w.id=t.workspace_id WHERE t.archived=0 AND t.status<>'done' AND (t.visibility='team' OR t.creator=?) ORDER BY t.due_date IS NULL,t.due_date,t.id");
        // project_id is optional until the task extension migration has run.
        $q->execute([crm_actor($u)]); $tasks=$q->fetchAll();
        studio_json(['tasks'=>$tasks,'today'=>$today,'attention_end'=>$end,'clients'=>(int)db()->query('SELECT COUNT(*) FROM bf_flow_clients WHERE active=1')->fetchColumn(),'sales'=>(int)db()->query("SELECT COUNT(*) FROM bf_flow_sales WHERE state<>'paid'")->fetchColumn()]);
    }
    if ($action==='flow-projects' || $action==='flow-project-create') {
        $w=(int)($in['workspace']??$_GET['workspace']??0); studio_access($u,$w);
        if ($action==='flow-project-create') {
            $key=flow_key($in['create_key']??null);
            db()->prepare('INSERT INTO bf_flow_projects (workspace_id,create_key,name,description,created_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)')->execute([$w,$key,studio_text($in['name']??'',150,true),studio_text($in['description']??'',4000),utc_now()]);
            studio_json(['id'=>(int)db()->lastInsertId()]);
        }
        $q=db()->prepare('SELECT p.*,(SELECT COUNT(*) FROM bf_tasks t WHERE t.project_id=p.id AND t.archived=0 AND (t.visibility=\'team\' OR t.creator=?)) AS tasks FROM bf_flow_projects p WHERE p.workspace_id=? ORDER BY p.id DESC'); $q->execute([crm_actor($u),$w]); studio_json(['items'=>$q->fetchAll()]);
    }
    if ($action==='flow-sales') {
        $q=db()->query("SELECT s.*,o.name,o.company,o.amount,o.workspace_id,o.phone,o.email FROM bf_flow_sales s JOIN bf_opportunities o ON o.id=s.opportunity_id ORDER BY s.updated_at DESC");
        studio_json(['items'=>$q->fetchAll()]);
    }
    if ($action==='flow-sale-item') {
        $id=(int)($_GET['id']??0);
        $q=db()->prepare('SELECT * FROM bf_flow_sales WHERE opportunity_id=?'); $q->execute([$id]);
        studio_json(['sale'=>$q->fetch()?:null]);
    }
    if (in_array($action,['flow-sale-send','flow-sale-approve','flow-sale-return','flow-sale-pay'],true)) {
        $id=(int)($in['id']??0);
        db()->beginTransaction();
        $q=db()->prepare('SELECT * FROM bf_opportunities WHERE id=? FOR UPDATE'); $q->execute([$id]); $o=$q->fetch();
        if (!$o) studio_error(404,'Oportunidade não encontrada.');
        $q=db()->prepare('SELECT * FROM bf_flow_sales WHERE opportunity_id=? FOR UPDATE'); $q->execute([$id]); $s=$q->fetch();
        if ($action==='flow-sale-send') {
            if ($s) { db()->commit(); studio_json(['ok'=>true]); }
            if (in_array($o['stage'],['disqualified','fake'],true)) throw new InvalidArgumentException('Reabra a oportunidade antes de encaminhar.');
            db()->prepare('INSERT INTO bf_flow_sales (opportunity_id,created_at,updated_at) VALUES (?,?,?)')->execute([$id,utc_now(),utc_now()]);
            crm_event($id,crm_actor($u),'Follow-up encerrado. Encaminhado para aprovação comercial.');
        } else {
            if (!$s) throw new InvalidArgumentException('Encaminhe a oportunidade para aprovação primeiro.');
            if ($action==='flow-sale-pay' && $s['state']==='paid') { db()->commit(); studio_json(['client_id'=>(int)$s['client_workspace_id']]); }
            if ((int)($in['revision']??0)!==(int)$s['revision']) studio_error(409,'Esta aprovação mudou. Reabra antes de continuar.');
            if ($s['state']==='paid') throw new InvalidArgumentException('Pagamento já registrado. O histórico não pode ser reaberto por esta ação.');
            if ($action==='flow-sale-return') {
                db()->prepare("UPDATE bf_flow_sales SET state='approval',approved_by=NULL,approved_at=NULL,approved_amount=NULL,revision=revision+1,updated_at=? WHERE opportunity_id=?")->execute([utc_now(),$id]);
                crm_event($id,crm_actor($u),'Aprovação devolvida para revisão comercial.');
            } elseif ($action==='flow-sale-approve') {
                if ($s['state']!=='approval') throw new InvalidArgumentException('Esta proposta já foi aprovada.');
                if ((float)$o['amount']<=0) throw new InvalidArgumentException('Defina o valor da oportunidade no CRM antes de aprovar.');
                db()->prepare("UPDATE bf_flow_sales SET state='payment',approved_by=?,approved_at=?,approved_amount=?,approved_identity=?,revision=revision+1,updated_at=? WHERE opportunity_id=?")->execute([crm_actor($u),utc_now(),$o['amount'],flow_sale_identity($o),utc_now(),$id]);
                crm_event($id,crm_actor($u),'Aprovação comercial registrada pela agência. Aguardando pagamento de R$ '.$o['amount'].'.');
            } else {
                if ($s['state']!=='payment') throw new InvalidArgumentException('É necessário aprovar antes de registrar pagamento.');
                if ($o['amount']!==$s['approved_amount']) throw new InvalidArgumentException('O valor mudou após a aprovação. Devolva para revisão e aprove novamente.');
                if (!hash_equals((string)$s['approved_identity'],flow_sale_identity($o))) throw new InvalidArgumentException('Os dados do cliente mudaram após a aprovação. Devolva para revisão e aprove novamente.');
                if (($in['confirmed']??false)!==true) throw new InvalidArgumentException('Confirme que conferiu o recebimento.');
                $reference=studio_text($in['reference']??'',200,true);
                $target=(int)($in['client_id']??0);
                if ($target) {
                    $q=db()->prepare('SELECT workspace_id FROM bf_flow_clients WHERE workspace_id=? FOR UPDATE'); $q->execute([$target]);
                    if (!$q->fetchColumn()) throw new InvalidArgumentException('Selecione um cliente existente.');
                } else {
                    $data=flow_clean_client(['contact'=>$o['name'],'email'=>$o['email'],'phone'=>$o['phone'],'document'=>$o['document'],'active'=>true,'details'=>['description'=>$o['notes']]]);
                    if (flow_duplicate($data)) throw new InvalidArgumentException('Já existe cliente com este e-mail/documento. Selecione o cadastro existente para vincular.');
                    $target=flow_insert_client($o['company']?:$o['name'],$data);
                }
                db()->prepare("UPDATE bf_flow_sales SET state='paid',client_workspace_id=?,payment_reference=?,paid_by=?,paid_at=?,revision=revision+1,updated_at=? WHERE opportunity_id=?")->execute([$target,$reference,crm_actor($u),utc_now(),utc_now(),$id]);
                db()->prepare("UPDATE bf_opportunities SET stage='won',revision=revision+1,updated_at=? WHERE id=?")->execute([utc_now(),$id]);
                crm_event($id,crm_actor($u),'Recebimento conferido manualmente pela agência: '.$reference.'. Vinculado ao cliente #'.$target.'. Sem confirmação bancária automática.');
            }
        }
        db()->commit(); studio_json(['ok'=>true]);
    }
    studio_error(404,'Ação não encontrada.');
}
