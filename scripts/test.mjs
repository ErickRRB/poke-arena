import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TEST_SUITES,selectTests} from './test-suites.mjs';

const names=process.argv.slice(2);
if(names.includes('--list')||!names.length){
  console.log('Pruebas por sección:');
  for(const [name,files]of Object.entries(TEST_SUITES))console.log(`  ${name.padEnd(10)} ${files.length} archivo${files.length===1?'':'s'}`);
  console.log('\nUso: npm test -- deck\nCompleta: npm run test:all (solo para cambios transversales)');
  if(!names.length)process.exitCode=2;
}else{
  try{
    const files=selectTests(names).map(file=>`tests/${file}`);
    console.log(`Secciones: ${names.join(', ')} · ${files.length} archivos`);
    const child=spawn(process.execPath,['--test',...files],{cwd:fileURLToPath(new URL('..',import.meta.url)),stdio:'inherit',windowsHide:true});
    child.on('error',error=>{console.error(error.message);process.exitCode=1;});
    child.on('exit',(code,signal)=>{process.exitCode=signal?1:code??1;});
  }catch(error){console.error(error.message);process.exitCode=2;}
}
