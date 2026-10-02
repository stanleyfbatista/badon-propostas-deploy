<?php
declare(strict_types=1);
require dirname(__DIR__) . '/_bootstrap.php';
require_once BADON_APP . '/crm.php';
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET','POST'],true)) studio_error(405,'Método não permitido.');
if (!studio_ready() || !crm_ready()) studio_error(503,'Inicialize CRM e perfis antes de enviar fotos.');
$u=studio_user();
if (!$u) studio_error(401,'Entre na sua conta para continuar.');
$actor=crm_actor($u);
if ($method==='GET') {
    $target=text_value($_GET['actor']??$actor);
    if (!preg_match('/^[au]:[1-9][0-9]*$/D',$target)) studio_error(404,'Foto indisponível.');
    if ($target!==$actor && !$u['agency'] && !str_starts_with($target,'a:')) {
        $q=db()->prepare('SELECT 1 FROM bf_members a JOIN bf_members b ON a.workspace_id=b.workspace_id WHERE a.user_id=? AND b.user_id=? LIMIT 1'); $q->execute([$u['id'],substr($target,2)]);
        if (!$q->fetchColumn()) studio_error(404,'Foto indisponível.');
    }
    $q=db()->prepare('SELECT avatar,avatar_mime FROM bf_profiles WHERE actor=?'); $q->execute([$target]); $p=$q->fetch();
    if (!$p || !$p['avatar']) studio_error(404,'Foto indisponível.');
    header('Content-Type: '.$p['avatar_mime']); header('X-Content-Type-Options: nosniff'); header("Content-Security-Policy: default-src 'none'; sandbox"); header('Cache-Control: private, no-store');
    echo $p['avatar']; exit;
}
if (!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) studio_error(403,'Sua sessão expirou. Entre novamente para continuar.','csrf_expired');
if (!rate_allowed('profile-photo',$actor,20,3600)) studio_error(429,'Aguarde antes de enviar outra foto.');
if ((int)($_SERVER['CONTENT_LENGTH']??0)>2*1048576+65536) studio_error(413,'Use uma foto de até 2 MB.');
try {
    if (($_POST['remove']??'')==='1') {
        db()->prepare('UPDATE bf_profiles SET avatar=NULL,avatar_mime=NULL,avatar_version=NULL WHERE actor=?')->execute([$actor]);
    } else {
        $f=$_FILES['file']??null;
        if (!is_array($f) || ($f['error']??null)!==UPLOAD_ERR_OK || !is_string($f['tmp_name']??null) || !is_uploaded_file($f['tmp_name'])) throw new InvalidArgumentException('Envie uma foto JPG, PNG ou WebP de até 2 MB.');
        $type=inspect_media($f['tmp_name'],(string)$f['name'],['image'=>2*1048576,'video'=>0]);
        $info=getimagesize($f['tmp_name']);
        if ($type['type']!=='image' || !$info || $info[0]>4096 || $info[1]>4096) throw new InvalidArgumentException('Foto: use JPG, PNG ou WebP com até 4096 pixels por lado.');
        $bytes=file_get_contents($f['tmp_name']); $mime=$info['mime'];
        // Strip metadata when GD is available; always serve as an inert, authenticated image.
        if (function_exists('imagecreatefromstring')) {
            $image=@imagecreatefromstring($bytes);
            if (!$image) throw new InvalidArgumentException('Imagem inválida.');
            ob_start(); imagepng($image); $bytes=ob_get_clean(); imagedestroy($image); $mime='image/png';
            if (strlen($bytes)>2*1048576) throw new InvalidArgumentException('Reduza as dimensões da foto antes de enviar.');
        }
        db()->prepare('INSERT INTO bf_profiles (actor,avatar,avatar_mime,avatar_version) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE avatar=VALUES(avatar),avatar_mime=VALUES(avatar_mime),avatar_version=VALUES(avatar_version)')->execute([$actor,$bytes,$mime,bin2hex(random_bytes(8))]);
    }
    studio_json(['profile'=>crm_profile($u)]);
} catch (InvalidArgumentException $e) { studio_error(422,$e->getMessage()); }
