// Reproducible bounded observation, not a balance benchmark. The opponent is a
// simple deterministic player: deploy the first affordable card every 5 s.
import {Game, CARDS, CPU_DECKS, DEFAULT_DECK} from '../dist/engine.js';

const preset=CPU_DECKS.find(p=>p.name==='Gigante y apoyo');
const game=new Game({seed:104729,deck:DEFAULT_DECK,cpuDeck:preset.cards});
const actions=[];
const deploy=game.deploy.bind(game);
game.deploy=(team,index,x,y)=>{
  const key=game.hands[team][index],energy=game.energy[team],hand=[...game.hands[team]];
  const visible=team===1?game.units.filter(u=>u.team===0&&u.hp>0).map(u=>({key:u.key,x:Math.round(u.x),y:Math.round(u.y),hp:Math.round(u.hp)})):undefined;
  const result=deploy(team,index,x,y);
  if(result.ok)actions.push({t:+game.elapsed.toFixed(2),team,key,x:Math.round(result.x??x),y:Math.round(result.y??y),energy:+energy.toFixed(2),hand,visible});
  return result;
};
game.start();
for(let tick=0;tick<90*30&&game.state==='playing';tick++){
  if(tick%150===0){
    for(let i=0;i<game.hands[0].length;i++){
      const key=game.hands[0][i],card=CARDS[key];
      if(card.cost>game.energy[0])continue;
      const enemy=game.units.find(u=>u.team===1&&u.hp>0);
      if(card.spell&&!enemy)continue;
      if(game.deploy(0,i,card.spell?enemy.x:158,card.spell?enemy.y:560).ok)break;
    }
  }
  game.step(1/30);
}
console.log(JSON.stringify({seed:104729,seconds:+game.elapsed.toFixed(2),playerDeck:DEFAULT_DECK,cpuDeck:preset.cards,actions,towers:game.towers.map(({team,lane,hp,maxHp})=>({team,lane,hp:Math.round(hp),maxHp})),energy:game.energy.map(x=>+x.toFixed(2)),state:game.state},null,2));
