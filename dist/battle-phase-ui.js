// Presentation uses the same multiplier and logical clock as CPU and snapshots.
export class BattlePhaseUi {
  constructor(document) {
    this.clock=document.getElementById('battle-clock');
    this.timer=document.getElementById('timer');
    this.boost=document.getElementById('boost');
    this.label=document.getElementById('phase-label');
    this.energy=document.querySelector('.energy-section');
    this.bar=document.getElementById('energy-bar');
    this.announcement=document.getElementById('battle-phase-announcement');
    this.reset();
  }
  reset() { this.phase=null;this.announcement.textContent=''; }
  update(game,{reduced=false}={}) {
    const multiplier=game.multiplier,overtime=!!game.overtime,phase=game.tiebreaker?'tiebreaker':overtime?'overtime':'regular';
    const beat=reduced||Math.floor((game.elapsed||0)*2)%2===0?'strong':'soft';
    this.clock.dataset.phase=phase;this.clock.dataset.beat=beat;
    this.energy.dataset.elixir=String(multiplier);this.energy.dataset.beat=beat;
    this.clock.classList.toggle('urgent',game.time<=30||overtime);
    const total=Math.max(0,Math.ceil(game.time));
    this.timer.textContent=Math.floor(total/60)+':'+String(total%60).padStart(2,'0');
    this.clock.setAttribute('aria-label',(overtime?'Tiempo extra. ':'')+this.timer.textContent+' restantes');
    this.boost.hidden=multiplier===1;this.boost.textContent=multiplier+'×';this.boost.dataset.elixir=String(multiplier);
    this.label.hidden=!overtime;this.label.textContent=game.tiebreaker?'Desempate':'Extra';
    const rate=multiplier===3?'Elixir triple':multiplier===2?'Elixir doble':'Elixir normal';
    this.bar.setAttribute('aria-valuetext',Math.floor(game.energy[0])+' de 10. '+rate);
    const key=phase+':'+multiplier;
    if(key!==this.phase){
      this.phase=key;
      this.announcement.textContent=game.tiebreaker?'Desempate de torres.':overtime?'Tiempo extra. '+rate+'. Primera torre destruida gana.':multiplier>1?rate+'.':'';
    }
  }
}
