import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';

const args=process.argv.slice(2),groups=['deck','battle','loading','online'];
const selected=args[0]==='all'?groups:[args[0]];
if(!selected.every(name=>groups.includes(name))){
  console.error('Uso: npm run test:ui:deck [-- --matrix]\nSecciones: deck, battle, loading, online. all es explícito.');process.exitCode=2;
}else{
  let playwright;
  for(const location of[process.env.POKE_ARENA_PLAYWRIGHT_MODULE,new URL('../qa/node_modules/playwright/index.mjs',import.meta.url).href,'playwright'].filter(Boolean)){
    try{playwright=await import(/^[A-Za-z]:[\\/]/.test(location)?pathToFileURL(location).href:location);break;}catch{}
  }
  if(!playwright){console.error('Falta Playwright para estas pruebas de navegador. Instalalo con npm install --prefix qa playwright. Las pruebas unitarias no lo necesitan.');process.exitCode=2;}
  else{
    const urlIndex=args.indexOf('--url'),url=urlIndex<0?process.env.POKE_ARENA_TEST_URL||'http://127.0.0.1:4173':args[urlIndex+1];
    const viewports=args.includes('--matrix')?[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:1440,height:980},{width:932,height:430}]:[{width:390,height:844}];
    const output=fileURLToPath(new URL('../qa/sections/',import.meta.url));await mkdir(output,{recursive:true});
    const browser=await playwright.chromium.launch({...(process.platform==='win32'?{channel:'msedge'}:{}),headless:true}),report={groups:{},matrix:args.includes('--matrix')};
    try{
      for(const group of selected){const start=performance.now(),{run}=await import(`../tests/browser/${group}.mjs`);const checks=await run({browser,url,viewports,output});report.groups[group]={...checks,durationMs:Math.round(performance.now()-start)};console.log(`${group}: OK (${report.groups[group].durationMs} ms)`);}
      await writeFile(`${output}/last-report.json`,JSON.stringify(report,null,2));
    }catch(error){console.error(error);process.exitCode=1;await writeFile(`${output}/last-report.json`,JSON.stringify({...report,error:error.stack},null,2));}
    finally{await browser.close();}
  }
}
