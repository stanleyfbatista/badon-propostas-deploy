<?php
declare(strict_types=1);
require_once __DIR__ . '/tasks.php';

const FLOW_GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';

// No configuration, secrets or tokens are included in browser responses.
function flow_google_config(): array
{
    $path = dirname(__DIR__) . '/badon-config/google-oauth.php';
    if (!is_file($path) || is_link($path)) return [];
    $c = require $path;
    return is_array($c) ? $c : [];
}
function flow_google_ready(): bool
{
    $c = flow_google_config();
    return !empty($c['enabled']) && !empty($c['client_id']) && !empty($c['client_secret'])
        && strlen(base64_decode($c['token_key'] ?? '', true) ?: '') === 32
        && function_exists('curl_init') && function_exists('openssl_verify')
        && (int)db()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('bf_google_accounts','bf_google_events')")->fetchColumn() === 2;
}
function flow_google_account(string $actor): ?array
{
    $q = db()->prepare('SELECT * FROM bf_google_accounts WHERE actor=?'); $q->execute([$actor]);
    return $q->fetch() ?: null;
}
function flow_google_local(string $actor): ?array
{
    if (!preg_match('/^([au]):([1-9][0-9]*)$/D', $actor, $m)) return null;
    $q = db()->prepare('SELECT * FROM ' . ($m[1] === 'a' ? 'admins' : 'bf_users') . ' WHERE id=?');
    $q->execute([$m[2]]); $u = $q->fetch();
    if (!$u) return null;
    if ($m[1] === 'u') {
        $q = db()->prepare('SELECT 1 FROM bf_members WHERE user_id=? LIMIT 1'); $q->execute([$u['id']]);
        if (!$q->fetchColumn()) return null;
    }
    return $u + ['agency' => $m[1] === 'a'];
}
function flow_google_status(array $u): array
{
    $ready = flow_google_ready(); $a = $ready ? flow_google_account(crm_actor($u)) : null;
    return ['available'=>$ready, 'email'=>$a['email'] ?? null, 'login_connected'=>!empty($a['login_enabled']),
        'calendar_connected'=>!empty($a['calendar_enabled']), 'last_sync'=>$a['last_sync'] ?? null,
        'sync_error'=>$a['sync_error'] ?? null];
}
function flow_google_crypt(string $value, string $actor, bool $decrypt = false): string
{
    $key = base64_decode(flow_google_config()['token_key'] ?? '', true);
    if (!is_string($key) || strlen($key) !== 32) throw new RuntimeException('Google key unavailable');
    if (!$decrypt) {
        $iv = random_bytes(12); $tag = '';
        $cipher = openssl_encrypt($value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $actor, 16);
        if ($cipher === false) throw new RuntimeException('Token encryption failed');
        return base64_encode($iv . $tag . $cipher);
    }
    $raw = base64_decode($value, true);
    if (!$raw || strlen($raw) < 29) throw new RuntimeException('Invalid encrypted token');
    $plain = openssl_decrypt(substr($raw,28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($raw,0,12), substr($raw,12,16), $actor);
    if ($plain === false) throw new RuntimeException('Token authentication failed');
    return $plain;
}
class FlowGoogleError extends RuntimeException
{
    public function __construct(public int $status, public string $reason = '') { parent::__construct('Google request failed'); }
}
function flow_google_http(string $url, string $method = 'GET', ?array $body = null, ?string $token = null, bool $form = false): array
{
    // All destinations are fixed Google endpoints. Never follow redirects or accept caller URLs.
    if (!preg_match('#^https://(?:oauth2\.googleapis\.com/(?:token|revoke)|www\.googleapis\.com/(?:oauth2/v1/certs|calendar/v3/calendars(?:/[^\s]*)?))$#D', $url)) throw new RuntimeException('Unapproved Google endpoint');
    // Isolated CLI tests only; HTTP requests cannot enable this transport.
    if (PHP_SAPI === 'cli' && defined('FLOW_GOOGLE_TEST') && FLOW_GOOGLE_TEST === true) return flow_google_test_http($url,$method,$body,$token,$form);
    $curl = curl_init($url); $response = '';
    $headers = ['Accept: application/json'];
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    if ($body !== null) $headers[] = 'Content-Type: ' . ($form ? 'application/x-www-form-urlencoded' : 'application/json');
    curl_setopt_array($curl, [CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_HTTPHEADER=>$headers,
        CURLOPT_FOLLOWLOCATION=>false, CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT=>5,
        CURLOPT_TIMEOUT=>15, CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_WRITEFUNCTION=>static function($c, string $chunk) use (&$response): int {
            if (strlen($response) + strlen($chunk) > 2000000) return 0;
            $response .= $chunk; return strlen($chunk);
        }]);
    if ($body !== null) curl_setopt($curl, CURLOPT_POSTFIELDS, $form ? http_build_query($body) : json_encode($body, JSON_THROW_ON_ERROR));
    $ok = curl_exec($curl); $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
    $data = json_decode($response, true); unset($response);
    if ($ok === false || $status < 200 || $status >= 300) {
        $reason = is_string($data['error'] ?? null) && $data['error'] === 'invalid_grant' ? 'reconnect' : 'request';
        throw new FlowGoogleError($status, $reason);
    }
    return is_array($data) ? $data : [];
}
function flow_google_b64(string $value): string
{
    if (!preg_match('/^[A-Za-z0-9_-]+$/D', $value)) throw new RuntimeException('Malformed token');
    $decoded = base64_decode(strtr($value, '-_', '+/'), true);
    if ($decoded === false) throw new RuntimeException('Malformed token');
    return $decoded;
}
// Certs come only from Google's TLS-verified endpoint, never from JWT jku/x5u.
function flow_google_verify(string $jwt, string $nonce, array $certs): array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3 || strlen($jwt) > 20000) throw new RuntimeException('Invalid ID token');
    $h = json_decode(flow_google_b64($parts[0]), true, 16, JSON_THROW_ON_ERROR);
    $p = json_decode(flow_google_b64($parts[1]), true, 16, JSON_THROW_ON_ERROR);
    if (!is_array($h) || !is_array($p) || ($h['alg'] ?? '') !== 'RS256' || !is_string($h['kid'] ?? null)
        || !isset($certs[$h['kid']]) || openssl_verify($parts[0].'.'.$parts[1], flow_google_b64($parts[2]), $certs[$h['kid']], OPENSSL_ALGO_SHA256) !== 1) throw new RuntimeException('Invalid ID signature');
    $id = flow_google_config()['client_id'] ?? '';
    if (!in_array($p['iss'] ?? '', ['accounts.google.com','https://accounts.google.com'], true)
        || ($p['aud'] ?? '') !== $id || (isset($p['azp']) && $p['azp'] !== $id)
        || !is_int($p['exp'] ?? null) || $p['exp'] <= time() || !is_int($p['iat'] ?? null) || $p['iat'] > time()+60
        || !is_string($p['nonce'] ?? null) || !hash_equals($nonce, $p['nonce'])
        || !is_string($p['sub'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{1,255}$/D', $p['sub'])
        || ($p['email_verified'] ?? false) !== true || !is_string($p['email'] ?? null)
        || strlen($p['email']) > 190 || !filter_var($p['email'], FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Invalid ID claims');
    return $p;
}
function flow_google_start(string $purpose, ?array $u, bool $remember = false): string
{
    if (!flow_google_ready()) throw new InvalidArgumentException('A conexão com o Google ainda não está disponível.');
    if (!in_array($purpose, ['login','link','calendar'], true)) throw new InvalidArgumentException('Ação inválida.');
    if ($purpose !== 'login') {
        if (!$u) throw new InvalidArgumentException('Entre no Flow antes de conectar sua conta Google.');
        $at = $_SESSION['auth_confirmed_at'] ?? 0;
        if ($at < time()-600) throw new InvalidArgumentException('Por segurança, saia e entre novamente com sua senha ou link por e-mail antes de vincular o Google.');
    } elseif ($u) throw new InvalidArgumentException('Você já está conectado. Use Configurações para vincular o Google.');
    if (!rate_allowed('google-start', client_identity(), 20, 900)) throw new InvalidArgumentException('Aguarde alguns minutos antes de tentar novamente.');
    $c = flow_google_config(); $state = bin2hex(random_bytes(32)); $nonce = bin2hex(random_bytes(32));
    $verifier = bin2hex(random_bytes(32));
    $_SESSION['google_pending'] = ['state'=>hash('sha256',$state), 'nonce'=>$nonce, 'verifier'=>$verifier,
        'purpose'=>$purpose, 'actor'=>$u ? crm_actor($u) : null, 'expires'=>time()+600, 'remember'=>$remember];
    $params = ['client_id'=>$c['client_id'], 'redirect_uri'=>$c['redirect_uri'], 'response_type'=>'code',
        'scope'=>'openid email' . ($purpose === 'calendar' ? ' '.FLOW_GOOGLE_SCOPE : ''), 'state'=>$state, 'nonce'=>$nonce,
        'code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verifier,true)),'+/','-_'),'='), 'code_challenge_method'=>'S256',
        'prompt'=>$purpose === 'calendar' ? 'consent select_account' : 'select_account'];
    if ($purpose === 'calendar') $params['access_type'] = 'offline';
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}
function flow_google_lock(string $actor, callable $work): mixed
{
    $key = 'flow-google-' . substr(hash('sha256',$actor),0,48);
    $q = db()->prepare('SELECT GET_LOCK(?,0)'); $q->execute([$key]);
    if (!(int)$q->fetchColumn()) throw new InvalidArgumentException('Uma sincronização está em andamento. Tente novamente em instantes.');
    try { return $work(); }
    finally { db()->prepare('SELECT RELEASE_LOCK(?)')->execute([$key]); }
}
function flow_google_callback(array $query): string
{
    $p = $_SESSION['google_pending'] ?? null; unset($_SESSION['google_pending']);
    if (!$p || !is_string($query['state'] ?? null) || !hash_equals($p['state'], hash('sha256',$query['state'])) || $p['expires'] < time()) throw new InvalidArgumentException('A confirmação do Google expirou. Inicie a conexão novamente pelo Flow.');
    if (!empty($query['error'])) throw new InvalidArgumentException('A permissão do Google não foi concluída. Seu acesso atual continua funcionando.');
    if (!flow_google_ready() || !is_string($query['code'] ?? null) || strlen($query['code']) > 4096) throw new InvalidArgumentException('Resposta do Google inválida.');
    $u = studio_user();
    if ($p['purpose'] !== 'login' && (!$u || crm_actor($u) !== $p['actor'])) throw new InvalidArgumentException('Entre novamente no Flow para confirmar a conexão.');
    if ($p['purpose'] === 'login' && $u) throw new InvalidArgumentException('A sessão mudou. Inicie a conexão novamente.');
    $c = flow_google_config();
    $tokens = flow_google_http('https://oauth2.googleapis.com/token','POST', ['grant_type'=>'authorization_code','code'=>$query['code'],
        'client_id'=>$c['client_id'],'client_secret'=>$c['client_secret'],'redirect_uri'=>$c['redirect_uri'],'code_verifier'=>$p['verifier']], null, true);
    $identity = flow_google_verify($tokens['id_token'] ?? '', $p['nonce'], flow_google_http('https://www.googleapis.com/oauth2/v1/certs'));
    if ($p['purpose'] === 'login') {
        $q = db()->prepare('SELECT actor FROM bf_google_accounts WHERE google_sub=? AND login_enabled=1'); $q->execute([$identity['sub']]);
        $local = flow_google_local((string)$q->fetchColumn());
        if (!$local) throw new InvalidArgumentException('Este Google não está vinculado a um acesso ativo. Entre por e-mail e conecte o Google em Configurações.');
        studio_login($local, (bool)$local['agency'], $p['remember'] && remember_ready());
        return 'Login com Google concluído.';
    }
    $actor = crm_actor($u);
    return flow_google_lock($actor, function() use ($actor,$identity,$tokens,$p): string {
        $old = flow_google_account($actor);
        $q = db()->prepare('SELECT actor FROM bf_google_accounts WHERE google_sub=?'); $q->execute([$identity['sub']]);
        $owner = $q->fetchColumn();
        if (($owner && $owner !== $actor) || ($old && $old['google_sub'] !== $identity['sub'])) throw new InvalidArgumentException('Esta conexão não corresponde à conta vinculada. Escolha a mesma conta Google.');
        $calendar = $p['purpose'] === 'calendar';
        if ($calendar && (!in_array(FLOW_GOOGLE_SCOPE, explode(' ', $tokens['scope'] ?? ''), true)
            || empty($tokens['refresh_token']))) throw new InvalidArgumentException('Autorize a criação da agenda Bādon Flow para ativar a sincronização.');
        if (!$old) db()->prepare('INSERT INTO bf_google_accounts (actor,google_sub,email,created_at,updated_at) VALUES (?,?,?,?,?)')->execute([$actor,$identity['sub'],strtolower($identity['email']),utc_now(),utc_now()]);
        if ($calendar) db()->prepare('UPDATE bf_google_accounts SET calendar_enabled=1,refresh_cipher=?,sync_error=NULL,updated_at=? WHERE actor=?')->execute([flow_google_crypt($tokens['refresh_token'],$actor),utc_now(),$actor]);
        else db()->prepare('UPDATE bf_google_accounts SET login_enabled=1,updated_at=? WHERE actor=?')->execute([utc_now(),$actor]);
        return $calendar ? 'Google Agenda autorizado. A sincronização será processada em até 5 minutos.' : 'Conta Google vinculada. Você já pode usá-la para entrar no Flow.';
    });
}
function flow_google_event(array $task, string $base): array
{
    // Tasks currently have dates, not appointment times. The 09:00 reminder is explicit in the UI.
    $day = tasks_date($task['due_date']);
    if (!$day) throw new InvalidArgumentException('A demanda precisa de prazo.');
    return ['summary'=>mb_substr($task['title'],0,200),
        'description'=>'Demanda do Bādon Flow. Consulte os detalhes e atualize o prazo na plataforma: '.$base.'/painel',
        'start'=>['dateTime'=>$day.'T09:00:00','timeZone'=>'America/Sao_Paulo'],
        'end'=>['dateTime'=>$day.'T09:15:00','timeZone'=>'America/Sao_Paulo'],
        'transparency'=>'transparent', 'visibility'=>'private',
        'reminders'=>['useDefault'=>false,'overrides'=>[['method'=>'popup','minutes'=>0],['method'=>'popup','minutes'=>1440]]],
        'extendedProperties'=>['private'=>['badonTask'=>(string)$task['id']]]];
}
function flow_google_sync(string $actor): array
{
    global $config;
    return flow_google_lock($actor, function() use ($actor,$config): array {
        $a = flow_google_account($actor); $u = flow_google_local($actor);
        if (!$a || !$a['calendar_enabled'] || !$a['refresh_cipher']) return ['changed'=>0];
        // A removed user can no longer export data. Stop and erase local refresh access.
        if (!$u) { db()->prepare('UPDATE bf_google_accounts SET calendar_enabled=0,refresh_cipher=NULL,login_enabled=0,sync_error=? WHERE actor=?')->execute(['access_removed',$actor]); return ['changed'=>0]; }
        try {
            $c = flow_google_config();
            $token = flow_google_http('https://oauth2.googleapis.com/token','POST', ['grant_type'=>'refresh_token','refresh_token'=>flow_google_crypt($a['refresh_cipher'],$actor,true),'client_id'=>$c['client_id'],'client_secret'=>$c['client_secret']],null,true);
            if (empty($token['access_token'])) throw new RuntimeException('Missing access token');
            $access = $token['access_token'];
            if (!$a['calendar_id']) {
                // Calendar insertion has no idempotency key. Never blindly retry an ambiguous timeout.
                if ($a['calendar_creating']) throw new FlowGoogleError(0,'calendar_setup');
                db()->prepare('UPDATE bf_google_accounts SET calendar_creating=1 WHERE actor=?')->execute([$actor]);
                try { $cal = flow_google_http('https://www.googleapis.com/calendar/v3/calendars','POST', ['summary'=>'Bādon Flow','description'=>'Demandas atribuídas a você no Bādon Flow. Prazos e alterações são gerenciados na plataforma.','timeZone'=>'America/Sao_Paulo'],$access); }
                catch (FlowGoogleError $e) {
                    if ($e->status >= 400 && $e->status < 500) db()->prepare('UPDATE bf_google_accounts SET calendar_creating=0 WHERE actor=?')->execute([$actor]);
                    else throw new FlowGoogleError(0,'calendar_setup');
                    throw $e;
                }
                if (empty($cal['id'])) throw new RuntimeException('Missing calendar');
                $a['calendar_id'] = $cal['id'];
                db()->prepare('UPDATE bf_google_accounts SET calendar_id=?,calendar_creating=0 WHERE actor=?')->execute([$cal['id'],$actor]);
            }
            $url = 'https://www.googleapis.com/calendar/v3/calendars/'.rawurlencode($a['calendar_id']).'/events';
            $q = db()->prepare("SELECT t.id,t.title,t.due_date FROM bf_tasks t WHERE t.assignee=? AND t.archived=0 AND t.status<>'done' AND t.due_date IS NOT NULL AND (t.visibility='team' OR t.creator=?)" . ($u['agency'] ? '' : ' AND EXISTS (SELECT 1 FROM bf_members m WHERE m.workspace_id=t.workspace_id AND m.user_id=?)'));
            $q->execute($u['agency'] ? [$actor,$actor] : [$actor,$actor,$u['id']]);
            $tasks = []; foreach ($q->fetchAll() as $t) $tasks[(int)$t['id']] = $t;
            $q = db()->prepare('SELECT * FROM bf_google_events WHERE actor=?'); $q->execute([$actor]);
            $exports = []; foreach ($q->fetchAll() as $e) $exports[(int)$e['task_id']] = $e;
            $changed = 0; $begin = time(); $pending = false;
            foreach ($exports as $id=>$e) {
                if (isset($tasks[$id])) continue;
                if ($changed >= 40 || time()-$begin > 45) { $pending=true; break; }
                try { flow_google_http($url.'/'.rawurlencode($e['event_id']).'?sendUpdates=none','DELETE',null,$access); }
                catch (FlowGoogleError $err) { if (!in_array($err->status,[404,410],true)) throw $err; }
                db()->prepare('DELETE FROM bf_google_events WHERE actor=? AND task_id=?')->execute([$actor,$id]); $changed++;
            }
            foreach ($tasks as $id=>$t) {
                $event = flow_google_event($t,$config['base_url']); $hash = hash('sha256',json_encode($event,JSON_THROW_ON_ERROR));
                $e = $exports[$id] ?? null;
                if ($e && $e['payload_hash'] === $hash) continue;
                if ($changed >= 40 || time()-$begin > 45) { $pending=true; break; }
                if (!$e) {
                    $e = ['event_id'=>bin2hex(random_bytes(16)), 'payload_hash'=>null];
                    // Reserve the ID before sending: retries after timeouts cannot duplicate events.
                    db()->prepare('INSERT INTO bf_google_events (actor,task_id,event_id) VALUES (?,?,?)')->execute([$actor,$id,$e['event_id']]);
                }
                try {
                    if ($e['payload_hash'] === null) {
                        try { flow_google_http($url.'?sendUpdates=none','POST',$event+['id'=>$e['event_id']],$access); }
                        catch (FlowGoogleError $err) { if ($err->status !== 409) throw $err; flow_google_http($url.'/'.$e['event_id'].'?sendUpdates=none','PATCH',$event,$access); }
                    } else flow_google_http($url.'/'.$e['event_id'].'?sendUpdates=none','PATCH',$event,$access);
                } catch (FlowGoogleError $err) {
                    // Removed manually: a new event ID is used on the next pass, avoiding tombstones.
                    if (!in_array($err->status,[404,410],true)) throw $err;
                    db()->prepare('DELETE FROM bf_google_events WHERE actor=? AND task_id=?')->execute([$actor,$id]); $pending=true; continue;
                }
                db()->prepare('UPDATE bf_google_events SET payload_hash=? WHERE actor=? AND task_id=?')->execute([$hash,$actor,$id]); $changed++;
            }
            db()->prepare('UPDATE bf_google_accounts SET last_sync=?,sync_error=?,updated_at=? WHERE actor=?')->execute([utc_now(),$pending?'pending':null,utc_now(),$actor]);
            return ['changed'=>$changed,'pending'=>$pending];
        } catch (Throwable $e) {
            $code = $e instanceof FlowGoogleError && $e->reason==='calendar_setup' ? 'calendar_setup' : ($e instanceof FlowGoogleError && ($e->reason==='reconnect' || $e->status===401) ? 'reconnect' : 'unavailable');
            db()->prepare('UPDATE bf_google_accounts SET sync_error=? WHERE actor=?')->execute([$code,$actor]);
            log_incident($e,'google-sync');
            throw new InvalidArgumentException($code==='calendar_setup' ? 'A criação da agenda precisa de conferência pela Bādon antes de continuar, para evitar duplicação.' : ($code==='reconnect' ? 'Autorize o Google Agenda novamente para retomar a sincronização.' : 'Não foi possível sincronizar agora. A conexão será tentada novamente.'));
        }
    });
}
function flow_google_handle(string $action, ?array $u, array $in): never
{
    if ($action === 'google-login') studio_json(['url'=>flow_google_start('login',$u,($in['remember']??false)===true)]);
    if (!$u) studio_error(401,'Entre na sua conta para continuar.','session_expired');
    if ($action === 'google-status') studio_json(flow_google_status($u));
    if (!flow_google_ready()) studio_error(503,'A conexão com o Google ainda não está disponível.');
    if (in_array($action,['google-link','google-calendar'],true)) studio_json(['url'=>flow_google_start($action==='google-link'?'link':'calendar',$u)]);
    $actor = crm_actor($u);
    if ($action === 'google-sync') {
        if (!rate_allowed('google-sync',$actor,6,300)) studio_error(429,'Aguarde alguns minutos antes de sincronizar novamente.');
        studio_json(flow_google_sync($actor));
    }
    if ($action === 'google-disconnect') {
        flow_google_lock($actor,function() use($actor): void {
            $a = flow_google_account($actor);
            if ($a && $a['refresh_cipher']) {
                try { flow_google_http('https://oauth2.googleapis.com/revoke','POST',['token'=>flow_google_crypt($a['refresh_cipher'],$actor,true)],null,true); }
                catch (FlowGoogleError $e) { if (!in_array($e->status,[400,401],true)) throw new InvalidArgumentException('Não foi possível revogar no Google. Tente novamente ou remova o acesso nas configurações da conta Google.'); }
            }
            db()->prepare('DELETE FROM bf_google_accounts WHERE actor=?')->execute([$actor]);
        });
        studio_json(['ok'=>true]);
    }
    studio_error(404,'Ação não encontrada.');
}
