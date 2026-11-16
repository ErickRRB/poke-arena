import { onlinePerf } from './perf.js?v=1';

// Available only in the explicitly requested tab. Collection still requires a click.
if (new URLSearchParams(location.search).get('perf') === '1') {
  const settings=document.getElementById('settings-dialog'),heading=settings.querySelector('.modal-heading');
  const toggle=document.createElement('button');
  toggle.type='button';toggle.className='perf-toggle';toggle.textContent='Diagnóstico';
  toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','perf-panel');
  heading.append(toggle);
  const panel=document.createElement('section');
  panel.id='perf-panel';panel.className='perf-panel';panel.hidden=true;panel.setAttribute('aria-label','Diagnóstico de rendimiento');
  panel.innerHTML=`<div class="perf-heading"><strong>Diagnóstico online</strong><button type="button" class="perf-close" aria-label="Cerrar diagnóstico">×</button></div>
    <div class="perf-actions"><button type="button" class="perf-start">Iniciar</button><button type="button" class="perf-stop" disabled>Detener</button><button type="button" class="perf-save" disabled>Guardar JSON</button></div>
    <p class="perf-status" role="status" aria-live="polite">Sin iniciar</p>
    <label class="perf-output-label" hidden>Informe para copiar<textarea class="perf-output" readonly rows="4" spellcheck="false"></textarea></label>`;
  settings.append(panel);
  const close=panel.querySelector('.perf-close'),start=panel.querySelector('.perf-start'),stop=panel.querySelector('.perf-stop'),save=panel.querySelector('.perf-save');
  const status=panel.querySelector('.perf-status'),label=panel.querySelector('.perf-output-label'),output=panel.querySelector('.perf-output');
  let timer=null;
  const setOpen=(open,restore=true)=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)close.focus();else if(restore&&settings.open)toggle.focus();};
  const finish=()=>{
    clearTimeout(timer);timer=null;onlinePerf.stop();const report=onlinePerf.report();
    if(!report)return;
    output.value=JSON.stringify(report,null,2);label.hidden=false;save.disabled=false;start.disabled=false;stop.disabled=true;
    status.textContent=report.stopReason==='limit'?'Finalizado (60 s)':'Finalizado';
  };
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  close.addEventListener('click',()=>setOpen(false));
  settings.addEventListener('cancel',event=>{if(!panel.hidden){event.preventDefault();setOpen(false);}});
  settings.addEventListener('close',()=>setOpen(false,false));
  start.addEventListener('click',()=>{
    onlinePerf.start();output.value='';label.hidden=true;save.disabled=true;start.disabled=true;stop.disabled=false;status.textContent='Registrando (máx. 60 s)';
    timer=setTimeout(()=>{onlinePerf.report();finish();},60000);
  });
  stop.addEventListener('click',finish);
  save.addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([output.value],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='poke-arena-diagnostico.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  output.addEventListener('focus',()=>output.select());
}
