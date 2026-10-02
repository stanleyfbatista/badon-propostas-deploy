<?php
declare(strict_types=1);

function remember_ready(): bool
{
    static $ready;
    if ($ready === null) $ready = (bool)db()->query("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='bf_remember_tokens'")->fetchColumn();
    return $ready;
}
function remember_name(): string
{
    global $config;
    return $config['environment']==='production' ? '__Host-badon_remember' : 'badon_forms_remember';
}
function remember_options(int $expires): array
{
    global $config;
    return ['expires'=>$expires,'path'=>'/','secure'=>$config['environment']==='production','httponly'=>true,'samesite'=>'Lax'];
}
function remember_cookie_hash(): ?string
{
    $raw=$_COOKIE[remember_name()]??null;
    return is_string($raw) && preg_match('/^[a-f0-9]{64}$/D',$raw) ? hash('sha256',$raw) : null;
}
function remember_forget(): void
{
    $present=isset($_COOKIE[remember_name()]) || isset($_SESSION['remember_hash']);
    if (!$present) return;
    $hashes=array_unique(array_filter([remember_cookie_hash(),$_SESSION['remember_hash']??null]));
    if ($hashes && remember_ready()) {
        $q=db()->prepare('DELETE FROM bf_remember_tokens WHERE token_hash=?');
        foreach ($hashes as $hash) $q->execute([$hash]);
    }
    setcookie(remember_name(),'',remember_options(time()-3600));
    unset($_COOKIE[remember_name()],$_SESSION['remember_hash']);
}
function remember_clear_auth(): void
{
    if (!isset($_SESSION['remember_hash'])) return;
    unset($_SESSION['admin_id'],$_SESSION['auth_hash'],$_SESSION['last_active'],$_SESSION['login_at'],$_SESSION['studio_user'],$_SESSION['studio_hash'],$_SESSION['studio_active'],$_SESSION['studio_login']);
    session_regenerate_id(true);
    $_SESSION['csrf']=bin2hex(random_bytes(32));
}
function remember_issue(array $user, bool $agency): void
{
    $raw=bin2hex(random_bytes(32)); $hash=hash('sha256',$raw); $expiry=time()+30*86400;
    db()->prepare('DELETE FROM bf_remember_tokens WHERE expires_at<=UTC_TIMESTAMP()')->execute();
    db()->prepare('INSERT INTO bf_remember_tokens (token_hash,actor,auth_version,expires_at,created_at) VALUES (?,?,?,?,?)')->execute([$hash,($agency?'a:':'u:').$user['id'],hash('sha256',$user['password_hash']),gmdate('Y-m-d H:i:s',$expiry),utc_now()]);
    setcookie(remember_name(),$raw,remember_options($expiry));
    $_COOKIE[remember_name()]=$raw;
    $_SESSION['remember_hash']=$hash;
}
function remember_restore(): void
{
    if (!isset($_COOKIE[remember_name()]) && !isset($_SESSION['remember_hash'])) return;
    $hash=remember_cookie_hash(); $record=null; $user=null;
    if ($hash && remember_ready()) {
        $q=db()->prepare('SELECT * FROM bf_remember_tokens WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()'); $q->execute([$hash]); $record=$q->fetch();
        if ($record && preg_match('/^([au]):([1-9][0-9]*)$/D',$record['actor'],$parts)) {
            $table=$parts[1]==='a'?'admins':'bf_users';
            $q=db()->prepare("SELECT id,password_hash FROM $table WHERE id=?"); $q->execute([$parts[2]]); $user=$q->fetch();
            if (!$user || !hash_equals($record['auth_version'],hash('sha256',$user['password_hash']))) $user=null;
        }
    }
    if (!$user) { remember_clear_auth(); remember_forget(); return; }
    $agency=$parts[1]==='a';
    $same=($_SESSION['remember_hash']??'')===$hash
        && (int)($_SESSION[$agency?'admin_id':'studio_user']??0)===(int)$user['id'];
    if (!$same) {
        session_regenerate_id(true);
        // Retain public form receipts/tickets; authentication and CSRF are replaced.
        unset($_SESSION['admin_id'],$_SESSION['auth_hash'],$_SESSION['studio_user'],$_SESSION['studio_hash']);
        $_SESSION['csrf']=bin2hex(random_bytes(32));
    }
    $_SESSION['remember_hash']=$hash;
    if ($agency) {
        $_SESSION['admin_id']=(int)$user['id']; $_SESSION['auth_hash']=$record['auth_version'];
        $_SESSION['last_active']=time(); $_SESSION['login_at']=time();
    } else {
        $_SESSION['studio_user']=(int)$user['id']; $_SESSION['studio_hash']=$record['auth_version'];
        $_SESSION['studio_active']=time(); $_SESSION['studio_login']=time();
    }
}
