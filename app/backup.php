<?php
declare(strict_types=1);
// CLI only. Export a consistent private snapshot; never expose database contents in stdout.
if (PHP_SAPI!=='cli') { http_response_code(404);exit; }
function backup_database(): array {
    $dir=dirname(BADON_APP).'/badon-config/backups';
    if (is_link($dir) || is_link(dirname($dir))) throw new RuntimeException('Unsafe backup path.');
    if (!is_dir($dir) && !mkdir($dir,0700,true)) throw new RuntimeException('Backup directory unavailable.');
    chmod($dir,0700);
    $tables=db()->query("SELECT TABLE_NAME,ENGINE FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")->fetchAll();
    foreach ($tables as $t) if (strtolower($t['ENGINE'])!=='innodb') throw new RuntimeException('Consistent backup requires InnoDB.');
    $partial=tempnam($dir,'flow-'.gmdate('Ymd-His').'-');
    if (!$partial || dirname($partial)!==realpath($dir)) throw new RuntimeException('Backup path unavailable.');
    chmod($partial,0600);
    $stream=gzopen($partial,'wb6');if (!$stream) throw new RuntimeException('Backup unavailable.');
    $write=function(string $value) use($stream):void { if(gzwrite($stream,$value)!==strlen($value))throw new RuntimeException('Incomplete backup.'); };
    $counts=[];
    try {
        db()->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        db()->beginTransaction();
        $write("-- Bādon database snapshot. Restore into an EMPTY database only.\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n");
        foreach ($tables as $table) {
            $name=$table['TABLE_NAME'];$quoted='`'.str_replace('`','``',$name).'`';
            $ddl=db()->query('SHOW CREATE TABLE '.$quoted)->fetch(PDO::FETCH_NUM)[1];
            $write($ddl.";\n");
            $rows=db()->query('SELECT * FROM '.$quoted);$count=0;
            while($row=$rows->fetch(PDO::FETCH_ASSOC)) {
                $columns=array_map(fn($k)=>'`'.str_replace('`','``',$k).'`',array_keys($row));
                // Hex literals preserve binary attachments, quotes, encodings and SQL mode.
                $values=array_map(fn($v)=>$v===null?'NULL':"X'".bin2hex((string)$v)."'",$row);
                $write('INSERT INTO '.$quoted.' ('.implode(',',$columns).') VALUES ('.implode(',',$values).");\n");$count++;
            }
            $counts[$name]=$count;
        }
        $write("SET FOREIGN_KEY_CHECKS=1;\n");db()->commit();
    } finally { gzclose($stream);if(db()->inTransaction())db()->rollBack(); }
    $path=$partial.'.sql.gz';
    if (!rename($partial,$path) || filesize($path)<32) throw new RuntimeException('Incomplete backup.');
    return ['path'=>$path,'tables'=>count($counts),'rows'=>$counts,'sha256'=>hash_file('sha256',$path)];
}
