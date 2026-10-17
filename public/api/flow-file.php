<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
require_once BADON_APP . '/flow-hub.php';
$method=$_SERVER['REQUEST_METHOD'];
if (!in_array($method,['GET','POST'],true)) studio_error(405,'Método não permitido.');
if (!studio_ready() || !flow_ready()) studio_error(503,'Atualize o Bādon Flow antes de enviar arquivos.');
$u=studio_user();
if (!$u) studio_error(401,'Entre na sua conta para acessar este arquivo.');
$actor=crm_actor($u);
function flow_file_access(array $u,int $workspace,int $task,bool $write): void {
    studio_access($u,$workspace,$write?'edit':'read');
    if (!$task) {
        if (!$u['agency']) studio_error(403,'Documentos do cadastro são internos da agência.');
        return;
    }
    $q=db()->prepare("SELECT id FROM bf_tasks WHERE id=? AND workspace_id=? AND (visibility='team' OR creator=?)");
    $q->execute([$task,$workspace,crm_actor($u)]);
    if (!$q->fetchColumn()) studio_error(404,'Arquivo indisponível.');
}
if ($method==='GET') {
    $q=db()->prepare('SELECT id,workspace_id,task_id,name,mime FROM bf_flow_files WHERE id=?');
    $q->execute([(int)($_GET['id']??0)]);$f=$q->fetch();
    if (!$f) studio_error(404,'Arquivo indisponível.');
    flow_file_access($u,(int)$f['workspace_id'],(int)$f['task_id'],false);
    $q=db()->prepare('SELECT content FROM bf_flow_files WHERE id=?');$q->execute([$f['id']]);
    header('Content-Type: '.$f['mime']);
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'; sandbox");
    header('Cache-Control: private, no-store');
    header("Content-Disposition: ".($f['mime']==='application/pdf'?'attachment':'inline')."; filename*=UTF-8''".rawurlencode($f['name']));
    echo $q->fetchColumn();exit;
}
if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) studio_error(403,'Sua sessão expirou. Entre novamente.','csrf_expired');
if ((int)($_SERVER['CONTENT_LENGTH']??0)>2*1048576+65536) studio_error(413,'Use arquivos de até 2 MB.');
$workspace=(int)($_POST['workspace']??0);$task=(int)($_POST['task']??0);
flow_file_access($u,$workspace,$task,true);
if (!rate_allowed('flow-file',$actor,60,3600)) studio_error(429,'Aguarde antes de enviar outro arquivo.');
try {
    $f=$_FILES['file']??null;
    if (!is_array($f) || ($f['error']??null)!==UPLOAD_ERR_OK || !is_string($f['tmp_name']??null) || !is_uploaded_file($f['tmp_name'])) throw new InvalidArgumentException('Envie JPG, PNG, WebP ou PDF de até 2 MB.');
    $bytes=file_get_contents($f['tmp_name']);
    if (!$bytes || strlen($bytes)>2*1048576) throw new InvalidArgumentException('Use arquivos de até 2 MB.');
    $mime=(new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
    if (!in_array($mime,['image/jpeg','image/png','image/webp','application/pdf'],true)) throw new InvalidArgumentException('Formato não permitido. Use JPG, PNG, WebP ou PDF.');
    if ($mime!=='application/pdf') {
        $info=@getimagesize($f['tmp_name']);
        if (!$info || $info['mime']!==$mime || $info[0]>4096 || $info[1]>4096) throw new InvalidArgumentException('Use imagens com até 4096 pixels por lado.');
        if (function_exists('imagecreatefromstring')) {
            $im=@imagecreatefromstring($bytes);
            if (!$im) throw new InvalidArgumentException('Imagem inválida.');
            ob_start();imagepng($im);$bytes=ob_get_clean();imagedestroy($im);$mime='image/png';
            if (strlen($bytes)>2*1048576) throw new InvalidArgumentException('Reduza as dimensões da imagem.');
        }
    }
    $name=studio_text(basename((string)$f['name']),180,true);
    db()->beginTransaction();
    // Lock the workspace so simultaneous uploads cannot bypass its storage limit.
    $q=db()->prepare('SELECT id FROM bf_workspaces WHERE id=? FOR UPDATE');$q->execute([$workspace]);$q->fetch();
    $q=db()->prepare('SELECT COALESCE(SUM(byte_size),0) FROM bf_flow_files WHERE workspace_id=?');$q->execute([$workspace]);
    if ((int)$q->fetchColumn()+strlen($bytes)>100*1048576) throw new InvalidArgumentException('Limite de 100 MB por espaço atingido. Use um link para arquivos maiores.');
    db()->prepare('INSERT INTO bf_flow_files (workspace_id,task_id,name,mime,content,byte_size,actor,created_at) VALUES (?,?,?,?,?,?,?,?)')->execute([$workspace,$task?:null,$name,$mime,$bytes,strlen($bytes),$actor,utc_now()]);
    $id=(int)db()->lastInsertId();db()->commit();
    studio_json(['url'=>'/api/flow-file.php?id='.$id,'name'=>$name,'mime'=>$mime]);
} catch (InvalidArgumentException $e) {
    if (db()->inTransaction()) db()->rollBack();
    studio_error(422,$e->getMessage());
}
