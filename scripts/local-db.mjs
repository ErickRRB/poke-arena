import{DatabaseSync}from'node:sqlite';import{readFileSync,mkdirSync}from'node:fs';import path from'node:path';
export function localDb(filename=':memory:'){
  if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});
  const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA journal_mode=WAL');
  if(!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE name='arena_players'").get())sqlite.exec(readFileSync(new URL('../drizzle/0000_online.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''));
  class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}async run(){const result=sqlite.prepare(this.sql).run(...this.args);return{success:true,meta:{changes:Number(result.changes)}};}async all(){return{results:sqlite.prepare(this.sql).all(...this.args)};}}
  return{prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>{const result=sqlite.prepare(s.sql).run(...s.args);return{success:true,meta:{changes:Number(result.changes)}};});sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close:()=>sqlite.close()};
}
