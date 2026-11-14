// Every actor is created by a successful deploy. Facing/movement/attacks/pushes
// come from Game.step; no unit positions, headings, stats or hit timers are set.
export const LEGAL_CAMERA_SCENARIOS=Object.freeze([
  {name:'ray-left-defence',key:'rayquaza',duration:7,commands:[{at:0,team:1,key:'sneaselAmbush',x:168,y:628},{at:1.9,team:0,key:'rayquaza',x:96,y:700}]},
  {name:'ray-right-defence',key:'rayquaza',duration:7,commands:[{at:0,team:1,key:'sneaselAmbush',x:432,y:628},{at:1.9,team:0,key:'rayquaza',x:504,y:700}]},
  {name:'ray-top-defence',key:'rayquaza',duration:7,commands:[{at:0,team:0,key:'sneaselAmbush',x:300,y:88},{at:2.7,team:1,key:'rayquaza',x:300,y:28}]},
  {name:'golem-left-log',key:'golem',duration:7,commands:[{at:0,team:0,key:'golem',x:96,y:508},{at:3,team:1,key:'log',x:96,y:328}]},
  {name:'golem-right-log',key:'golem',duration:7,commands:[{at:0,team:0,key:'golem',x:504,y:508},{at:3,team:1,key:'log',x:504,y:328}]},
]);

const deck=['rayquaza','golem','sneaselAmbush','log','pikachu','squirtle','bulbasaur','charmander'];
export function runLegalCameraScenario({Game},name,{onFrame=()=>{},onEvent=()=>{},stopFrame=null}={}){
  const definition=LEGAL_CAMERA_SCENARIOS.find(s=>s.name===name);if(!definition)throw Error('Unknown legal camera scenario: '+name);
  const events=[],deployments=[];let game;
  game=new Game({seed:46321,deck,cpuDeck:deck,onEvent:event=>{
    const row={type:event.type,at:game?.elapsed??0,key:event.attacker?.key||event.sourceKey||event.unit?.key||event.key,actorId:event.attacker?.id||event.unit?.id,
      x:event.attacker?.x??event.unit?.x??event.x,y:event.attacker?.y??event.unit?.y??event.y,dx:event.attacker?.dx??event.unit?.dx,dy:event.attacker?.dy??event.unit?.dy};
    if(['deploy','attackStart','attackRelease','spellHit','damage'].includes(event.type))events.push(row);onEvent(event,game);
  }});
  game.aiEnabled=false;game.start();
  let next=0;const dt=1/60,frames=Math.round(definition.duration/dt),last=stopFrame??frames;
  // Wait for real regeneration instead of granting resources or altering cards.
  while(Math.min(...game.energy)<10-1e-7){game.step(dt);if(game.elapsed>60)throw Error('Energy warmup did not finish');}
  const origin=game.elapsed;
  for(let frame=0;frame<=Math.min(last,frames);frame++){
    while(next<definition.commands.length&&definition.commands[next].at<=game.elapsed-origin+1e-7){
      const command=definition.commands[next++],index=game.hands[command.team].indexOf(command.key);
      if(index<0)throw Error(command.key+' is not in the actual hand');
      const legal=game.canDeploy(command.team,command.key,command.x,command.y),result=game.deploy(command.team,index,command.x,command.y);
      deployments.push({...command,executedAt:game.elapsed,scenarioAt:game.elapsed-origin,requestedCellLegal:legal,result});
      if(!result.ok)throw Error(name+': '+JSON.stringify(deployments.at(-1)));
    }
    onFrame(game,frame,definition);
    if(frame<last)game.step(dt);
  }
  return{game,definition,events,deployments,origin};
}
