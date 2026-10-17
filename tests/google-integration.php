<?php
declare(strict_types=1);
// Runs against the throwaway integration account. No requests reach Google.
define('FLOW_GOOGLE_TEST',true);
require $argv[1] . '/bootstrap.php';
if ($config['environment'] !== 'development') throw new RuntimeException('Tests require isolated development fixture');
require $argv[1] . '/google.php';
session_start();
$privatePath = dirname($argv[1]).'/badon-config/google-oauth.php';
if (file_exists($privatePath)) throw new RuntimeException('Refuse to overwrite existing Google configuration');
$googleConfig = ['enabled'=>true,'client_id'=>'test.apps.googleusercontent.com','client_secret'=>'fake-secret','token_key'=>base64_encode(random_bytes(32)),'redirect_uri'=>$config['base_url'].'/api/google-callback.php'];
file_put_contents($privatePath,'<?php return '.var_export($googleConfig,true).';'); chmod($privatePath,0600);
function check(bool $condition,string $message): void { if (!$condition) throw new RuntimeException($message); }
function rejects(callable $work): void { try { $work(); } catch (Throwable $e) { return; } throw new RuntimeException('Expected rejection'); }
function b64(string $v): string { return rtrim(strtr(base64_encode($v),'+/','-_'),'='); }
$key = openssl_pkey_new(['private_key_bits'=>2048,'private_key_type'=>OPENSSL_KEYTYPE_RSA]);
$public = openssl_pkey_get_details($key)['key'];
function jwt(array $claims, string $alg='RS256'): string {
    global $key; $value=b64(json_encode(['alg'=>$alg,'kid'=>'test'])).'.'.b64(json_encode($claims));
    openssl_sign($value,$signature,$key,OPENSSL_ALGO_SHA256); return $value.'.'.b64($signature);
}
$claims=['iss'=>'https://accounts.google.com','aud'=>$googleConfig['client_id'],'exp'=>time()+600,'iat'=>time(),'nonce'=>'test-nonce','sub'=>'test-sub','email'=>'google@example.invalid','email_verified'=>true];
$remote=[]; $calls=[]; $timeout=false; $calendarTimeout=false; $failRefresh=false; $testIdentity=$claims;
function flow_google_test_http(string $url,string $method,?array $body,?string $token,bool $form): array {
    global $remote,$calls,$timeout,$calendarTimeout,$failRefresh,$testIdentity,$public;
    $calls[]=[$url,$method,$body];
    if ($url==='https://www.googleapis.com/oauth2/v1/certs') return ['test'=>$public];
    if ($url==='https://oauth2.googleapis.com/revoke') return [];
    if ($url==='https://oauth2.googleapis.com/token') {
        if ($failRefresh) throw new FlowGoogleError(400,'reconnect');
        if (($body['grant_type']??'')==='refresh_token') return ['access_token'=>'fake-access'];
        return ['access_token'=>'fake-access','refresh_token'=>'fake-refresh','scope'=>'openid email '.FLOW_GOOGLE_SCOPE,'id_token'=>jwt($testIdentity)];
    }
    if ($url==='https://www.googleapis.com/calendar/v3/calendars') {
        if ($calendarTimeout) throw new FlowGoogleError(0);
        return ['id'=>'test-calendar'];
    }
    if (str_contains($url,'/events')) {
        check($token==='fake-access','Authenticated calendar transport');
        $id=$body['id']??basename(parse_url($url,PHP_URL_PATH));
        if ($method==='POST') {
            if (isset($remote[$id])) throw new FlowGoogleError(409);
            $remote[$id]=$body;
            if ($timeout) { $timeout=false; throw new FlowGoogleError(0); }
        } elseif ($method==='DELETE') { if (!isset($remote[$id])) throw new FlowGoogleError(404); unset($remote[$id]); }
        elseif ($method==='PATCH') { if (!isset($remote[$id])) throw new FlowGoogleError(404); $remote[$id]=$body+['id'=>$id]; }
        else throw new RuntimeException('Unexpected test method');
        return ['id'=>$id];
    }
    throw new RuntimeException('Unexpected test URL');
}
try {
    db()->exec(file_get_contents($argv[1].'/google-schema.sql'));
    db()->exec(file_get_contents($argv[1].'/google-schema.sql'));
    check(flow_google_ready(),'Additive Google migration');
    check(flow_google_verify(jwt($claims),'test-nonce',['test'=>$public])['sub']==='test-sub','Valid signed identity');
    foreach (['aud'=>'other','iss'=>'https://evil.invalid','exp'=>time()-1,'iat'=>time()+1000,'nonce'=>'wrong','email_verified'=>false,'azp'=>'other'] as $field=>$value) rejects(fn()=>flow_google_verify(jwt(array_replace($claims,[$field=>$value])),'test-nonce',['test'=>$public]));
    rejects(fn()=>flow_google_verify(jwt($claims,'none'),'test-nonce',['test'=>$public]));
    rejects(fn()=>flow_google_verify(jwt($claims),'test-nonce',[]));
    $cipher=flow_google_crypt('private-refresh','a:1');
    check(!str_contains($cipher,'private-refresh')&&flow_google_crypt($cipher,'a:1',true)==='private-refresh','Authenticated token encryption');
    rejects(fn()=>flow_google_crypt($cipher,'u:1',true));
    rejects(fn()=>flow_google_http('https://evil.invalid/token'));
    $admin=db()->query('SELECT * FROM admins ORDER BY id LIMIT 1')->fetch(); $actor='a:'.$admin['id'];
    studio_login($admin,true); $u=studio_user();
    $url=flow_google_start('link',$u); parse_str(parse_url($url,PHP_URL_QUERY),$params);
    check($params['scope']==='openid email'&&!isset($params['access_type']),'Login scope excludes calendar');
    check($params['code_challenge_method']==='S256','PKCE enabled');
    rejects(fn()=>flow_google_callback(['state'=>'bad','code'=>'fake']));
    rejects(fn()=>flow_google_callback(['state'=>$params['state'],'code'=>'fake']));
    $url=flow_google_start('link',$u); parse_str(parse_url($url,PHP_URL_QUERY),$params);
    $testIdentity=array_replace($claims,['nonce'=>$params['nonce']]);
    check(str_contains(flow_google_callback(['state'=>$params['state'],'code'=>'fake']),'vinculada'),'Link existing local account');
    check(flow_google_account($actor)['login_enabled']==1&&flow_google_account($actor)['calendar_enabled']==0,'No automatic calendar authorization');
    rejects(fn()=>flow_google_callback(['state'=>$params['state'],'code'=>'fake']));
    $_SESSION['auth_confirmed_at']=time()-601;
    rejects(fn()=>flow_google_start('calendar',$u)); $_SESSION['auth_confirmed_at']=time();
    $url=flow_google_start('calendar',$u); parse_str(parse_url($url,PHP_URL_QUERY),$params);
    check(str_contains($params['scope'],FLOW_GOOGLE_SCOPE)&&$params['access_type']==='offline','Minimal offline calendar scope');
    $testIdentity=array_replace($claims,['nonce'=>$params['nonce'],'sub'=>'different']);
    rejects(fn()=>flow_google_callback(['state'=>$params['state'],'code'=>'fake']));
    $url=flow_google_start('calendar',$u); parse_str(parse_url($url,PHP_URL_QUERY),$params);
    $testIdentity=array_replace($claims,['nonce'=>$params['nonce']]); flow_google_callback(['state'=>$params['state'],'code'=>'fake']);
    check(flow_google_account($actor)['refresh_cipher']!=='fake-refresh','No plaintext refresh token in database');
    $_SESSION=[];
    $url=flow_google_start('login',null); parse_str(parse_url($url,PHP_URL_QUERY),$params);
    $testIdentity=array_replace($claims,['nonce'=>$params['nonce'],'sub'=>'stranger']);
    rejects(fn()=>flow_google_callback(['state'=>$params['state'],'code'=>'fake'])); check(studio_user()===null,'Unknown Google cannot register or login');
    $url=flow_google_start('login',null); parse_str(parse_url($url,PHP_URL_QUERY),$params);
    $testIdentity=array_replace($claims,['nonce'=>$params['nonce']]); flow_google_callback(['state'=>$params['state'],'code'=>'fake']);
    check(studio_user()['agency']&&crm_actor(studio_user())===$actor,'Linked Google authenticates original role');
    $workspace=db()->query('SELECT id FROM bf_workspaces LIMIT 1')->fetchColumn();
    $q=db()->prepare("INSERT INTO bf_tasks (workspace_id,creator,create_key,title,description,visibility,assignee,status,priority,due_date,checklist_json,created_at,updated_at) VALUES (?,?,?,'Google test','CONFIDENTIAL','team',?,'todo','normal','2026-11-10','[]',UTC_TIMESTAMP(),UTC_TIMESTAMP())");
    $q->execute([$workspace,$actor,bin2hex(random_bytes(18)),$actor]); $task=(int)db()->lastInsertId();
    // Only test-assigned demand is exported; all other fixtures have different assignees or are temporarily excluded.
    $prior=db()->prepare('SELECT id,assignee FROM bf_tasks WHERE assignee=? AND id<>?'); $prior->execute([$actor,$task]); $restore=$prior->fetchAll();
    db()->prepare('UPDATE bf_tasks SET assignee=NULL WHERE assignee=? AND id<>?')->execute([$actor,$task]);
    $calendarTimeout=true; rejects(fn()=>flow_google_sync($actor));
    $calendarCalls=count(array_filter($calls,fn($c)=>$c[0]==='https://www.googleapis.com/calendar/v3/calendars'));
    rejects(fn()=>flow_google_sync($actor));
    check(flow_google_account($actor)['sync_error']==='calendar_setup' && $calendarCalls===count(array_filter($calls,fn($c)=>$c[0]==='https://www.googleapis.com/calendar/v3/calendars')),'Ambiguous calendar creation pauses without duplicate retry');
    // Synthetic recovery after verifying the test provider has no calendar.
    $calendarTimeout=false; db()->prepare('UPDATE bf_google_accounts SET calendar_creating=0 WHERE actor=?')->execute([$actor]);
    $timeout=true; rejects(fn()=>flow_google_sync($actor));
    check(count($remote)===1,'Remote create succeeded before simulated timeout');
    flow_google_sync($actor); flow_google_sync($actor);
    check(count($remote)===1,'Retry and repeated sync do not duplicate events');
    $event=array_values($remote)[0];
    check(!str_contains(json_encode($event),'CONFIDENTIAL')&&!isset($event['attendees']),'No descriptions or invitations exported');
    check($event['start']['dateTime']==='2026-11-10T09:00:00'&&$event['reminders']['overrides'][1]['minutes']===1440,'Explicit deadline time and reminders');
    db()->prepare("UPDATE bf_tasks SET due_date='2026-11-11' WHERE id=?")->execute([$task]); flow_google_sync($actor);
    check(count($remote)===1&&array_values($remote)[0]['start']['dateTime']==='2026-11-11T09:00:00','Deadline updates same event');
    db()->prepare("UPDATE bf_tasks SET visibility='private',creator='a:99999' WHERE id=?")->execute([$task]); flow_google_sync($actor);
    check(count($remote)===0,'Private task of another creator removed');
    db()->prepare("UPDATE bf_tasks SET visibility='team',creator=? WHERE id=?")->execute([$actor,$task]); flow_google_sync($actor);
    check(count($remote)===1,'Reappearing demand gets fresh event ID');
    db()->prepare("UPDATE bf_tasks SET status='done' WHERE id=?")->execute([$task]); flow_google_sync($actor);
    check(count($remote)===0,'Completed demand removes exported reminder');
    $failRefresh=true; rejects(fn()=>flow_google_sync($actor));
    check(flow_google_account($actor)['sync_error']==='reconnect','Revocation/expiration surfaced'); $failRefresh=false;
    foreach ($restore as $r) db()->prepare('UPDATE bf_tasks SET assignee=? WHERE id=?')->execute([$r['assignee'],$r['id']]);
    db()->prepare('DELETE FROM bf_tasks WHERE id=?')->execute([$task]);
    db()->prepare('DELETE FROM bf_google_accounts WHERE actor=?')->execute([$actor]);
    echo "OK: Google signature/claims, state/replay, PKCE, fresh-session linking, invitation-only login, encryption, minimal scopes, idempotent sync, privacy, updates, completion and revocation.\n";
} finally { unlink($privatePath); }
