import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
// cf/config is import-only. Resolve through Node's ESM conditions from the
// installed realtime package, matching the CLI rather than CommonJS require.
const configURL=execFileSync(process.execPath,['--input-type=module','-e','console.log(import.meta.resolve("cf/config"))'],{cwd:new URL('../realtime/',import.meta.url),encoding:'utf8',windowsHide:true}).trim();
const {bindings,exports:workerExports}=await import(configURL);
async function load(text){return(await import('data:text/javascript;base64,'+Buffer.from(text.replace("'cf/config'",JSON.stringify(configURL))).toString('base64'))).default;}
const old=await load(execFileSync('git',['show','8ce0f53635fdbb1e7735c4ed4751ee98b5a9adc8:realtime/cloudflare.config.ts'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
const select=await load(await readFile(new URL('../realtime/cloudflare.config.ts',import.meta.url),'utf8'));

test('absent and other modes retain the exact installed C1 config object and bindings',()=>{
 for(const mode of [undefined,'production','development','c4'])assert.deepEqual(select({mode}),old);assert.equal(select({mode:undefined}).worker.name,'poke-arena-realtime');
});

test('c4-production is self-targeted, canonical-only and closed without altering C1 exports/date/policy',()=>{
 const current=select({mode:'c4-production'}).worker;assert.equal(current.name,'poke-arena-realtime-c4');assert.equal(current.entrypoint,old.worker.entrypoint);assert.equal(current.compatibilityDate,old.worker.compatibilityDate);assert.deepEqual(current.observability,old.worker.observability);assert.deepEqual(current.exports,old.worker.exports);
 assert.deepEqual(current.env,{LOBBY:bindings.durableObject({worker:current.name,exportName:'ArenaLobby'}),ARENAS:bindings.durableObject({worker:current.name,exportName:'ArenaRoom'}),ALLOWED_ORIGINS:bindings.text('https://poke-arena-web.eriickramiirez.workers.dev'),ONLINE_SERVICE:bindings.text('c4'),C4_NEW_SEARCHES:bindings.text('0')});assert.deepEqual(current.exports.ArenaLobby,workerExports.durableObject({storage:'sqlite'}));assert.deepEqual(current.exports.ArenaRoom,workerExports.durableObject({storage:'sqlite'}));assert.notDeepEqual(current.env.LOBBY,old.worker.env.LOBBY);assert.notDeepEqual(current.env.ARENAS,old.worker.env.ARENAS);
});
