import { onlinePerf } from './perf.js?v=1';

// Available only in the explicitly requested tab. Collection still requires a click.
if (new URLSearchParams(location.search).get('perf') === '1') {
  const host = document.createElement('aside');
  host.className = 'perf-access';
  host.setAttribute('aria-label', 'Diagnóstico de rendimiento');
  host.innerHTML = `<button type="button" class="perf-toggle" aria-expanded="false" aria-controls="perf-panel">Diagnóstico</button>
    <div id="perf-panel" class="perf-panel" hidden>
      <div class="perf-heading"><strong>Diagnóstico online</strong><button type="button" class="perf-close" aria-label="Cerrar diagnóstico">×</button></div>
      <p>Máximo 60 segundos. El informe queda en esta pestaña.</p>
      <div class="perf-actions"><button type="button" class="perf-start">Iniciar</button><button type="button" class="perf-stop" disabled>Detener</button><button type="button" class="perf-save" disabled>Guardar JSON</button></div>
      <p class="perf-status" role="status" aria-live="polite">Sin iniciar</p>
      <label class="perf-output-label" hidden>Informe para copiar<textarea class="perf-output" readonly rows="4" spellcheck="false"></textarea></label>
    </div>`;
  document.body.append(host);
  const toggle=host.querySelector('.perf-toggle'),panel=host.querySelector('.perf-panel'),close=host.querySelector('.perf-close');
  const start=host.querySelector('.perf-start'),stop=host.querySelector('.perf-stop'),save=host.querySelector('.perf-save');
  const status=host.querySelector('.perf-status'),label=host.querySelector('.perf-output-label'),output=host.querySelector('.perf-output');
  let timer=null;
  const setOpen=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(!open)toggle.focus();};
  const finish=()=>{
    clearTimeout(timer);timer=null;onlinePerf.stop();const report=onlinePerf.report();
    if(!report)return;
    output.value=JSON.stringify(report,null,2);label.hidden=false;save.disabled=false;start.disabled=false;stop.disabled=true;
    status.textContent=report.stopReason==='limit'?'Finalizado (60 segundos)':'Finalizado';
  };
  toggle.addEventListener('click',()=>setOpen(panel.hidden));
  close.addEventListener('click',()=>setOpen(false));
  start.addEventListener('click',()=>{
    onlinePerf.start();output.value='';label.hidden=true;save.disabled=true;start.disabled=true;stop.disabled=false;status.textContent='Registrando';
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
