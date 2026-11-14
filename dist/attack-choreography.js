// Native poses reviewed in all eight views. Each release repeats a short gesture
// instead of stretching one contact drawing over an entire multi-hit attack.
const gesture=(prepare,contact,follow,rest=0)=>({prepare,contact,follow,rest});
const PROFILES={
  snorlax:{attackContactFrame:7},
  lugia:{movementAnchor:'body',attackFrames:[10,2,10],attackContactFrame:2},
  rayquaza:{movementAnchor:'body',attackContactFrame:2},
  beedrill:{movementAnchor:'body',emitter:'hands',attackGestures:[gesture(4,10,16)]},
  koffing:{attackAnim:'Shoot',movementAnchor:'body',attackFrames:[0,1,7,0],attackContactFrame:7},
  kangaskhan:{attackAnim:'Shoot',movementAnchor:'body',emitter:'body',attackFrames:[0,7,8,7,0],attackContactFrame:8},
  babyKangaskhan:{attackAnim:'Shoot',movementAnchor:'body',emitter:'body',attackFrames:[0,7,8,7,0],attackContactFrame:8},
  machamp:{attackAnim:'Punch',emitter:'leadHand',attackGestures:[gesture(1,4,5)]},
  scyther:{attackAnim:'Slice',emitter:'leadHand',attackGestures:[gesture(0,6,12)]},
  nidoking:{attackAnim:'Shoot',emitter:'leadHand',attackGestures:[gesture(2,7,14)]},
  scizor:{attackAnim:'MultiScratch',emitter:'leadHand',attackGestures:[gesture(0,4,6),gesture(6,8,12,13)]},
  dragonite:{attackGestures:[gesture(2,5,11)]},
  salamence:{attackGestures:[gesture(2,3,5,2)]},
  blaziken:{emitter:'leadHand',attackGestures:[gesture(0,2,8)]},
  crobat:{movementAnchor:'body',attackGestures:[gesture(2,6,2),gesture(2,8,2)]},
  gardevoir:{attackAnim:'Appeal',emitter:'leadHand',attackGestures:[gesture(3,4,3)]},
  treecko:{attackAnim:'Appeal',emitter:'leadHand',attackGestures:[gesture(5,6,5)]},
  raltsTrio:{attackAnim:'Attack',attackGestures:[gesture(2,3,2)]},
  raltsToken:{attackAnim:'Attack',attackGestures:[gesture(2,3,2)]},
};
export function applyAttackChoreography(cards){
  for(const[key,profile]of Object.entries(PROFILES))Object.assign(cards[key],profile);
}
