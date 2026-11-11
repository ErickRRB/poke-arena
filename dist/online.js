export class OnlineClient{
  constructor({onSnapshot,onSearch,onConnection}){Object.assign(this,{onSnapshot,onSearch,onConnection});this.active=false;this.version=-1;this.seq=0;this.generation=0;this.actionChain=Promise.resolve();}
  async request(path,body,keepalive=false){
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:`Bearer ${this.token}`}:{})},body:JSON.stringify(body),cache:'no-store',keepalive,signal:keepalive?undefined:AbortSignal.timeout(8000)});
    const result=await response.json();if(!response.ok){const error=Error(result.error||'No se pudo conectar.');error.status=response.status;throw error;}return result;
  }
  async start(name,deck){
    this.active=true;this.mode='search';this.started=Date.now();this.name=name;this.deck=deck;const generation=++this.generation;
    this.token=sessionStorage.getItem('poke-arena:online-token');
    if(!this.token){const session=await this.request('/api/session',{name,deck});if(generation!==this.generation)return;this.token=session.token;sessionStorage.setItem('poke-arena:online-token',this.token);}
    await this.tick(generation);
  }
  apply(packet){
    if(packet.status!=='matched'||packet.version<this.version)return;
    this.mode='battle';this.version=packet.version;const events=packet.events.filter(e=>e.seq>this.seq);this.seq=packet.seq;
    this.onSnapshot({...packet,events});this.onConnection('');
  }
  async tick(generation=this.generation){
    if(!this.active||generation!==this.generation)return;
    try{const packet=await this.request(this.mode==='search'?'/api/queue':'/api/battle',this.mode==='search'?{name:this.name,deck:this.deck}:{after:this.seq});if(!this.active||generation!==this.generation)return;if(packet.status==='searching')this.onSearch(Date.now()-this.started);else this.apply(packet);this.onConnection('');}
    catch(error){if(!this.active||generation!==this.generation)return;if(error.status===401){this.token=null;sessionStorage.removeItem('poke-arena:online-token');this.active=false;this.onConnection('La búsqueda expiró. Volvé a intentar.');return;}this.onConnection('Reconectando…');}
    if(this.active&&generation===this.generation)this.timer=setTimeout(()=>this.tick(generation),this.mode==='search'?950:200);
  }
  send(action){
    const generation=this.generation,body={...action,nonce:crypto.randomUUID(),after:this.seq};
    this.actionChain=this.actionChain.catch(()=>{}).then(async()=>{let lastError;for(let attempt=0;attempt<3;attempt++){if(!this.active||generation!==this.generation)return{ok:false,reason:'Partida cerrada.'};try{const packet=await this.request('/api/battle',body);if(generation!==this.generation)return{ok:false};this.apply(packet);return packet.result||{ok:true};}catch(error){lastError=error;if(error.status&&error.status!==409)break;}}this.onConnection('Reconectando…');return{ok:false,reason:lastError?.message||'No se pudo enviar la jugada.'};});return this.actionChain;
  }
  close(){this.active=false;this.generation++;clearTimeout(this.timer);return this.token?this.request('/api/cancel',{nonce:crypto.randomUUID()},true).catch(()=>{}):Promise.resolve();}
}
