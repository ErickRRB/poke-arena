// Preserve the old mobile card when Blastoise becomes the separate Cannon card.
export const currentCardKey=key=>key==='blastoise'?'octillery':key;
export const currentDeck=deck=>Array.isArray(deck)?deck.map(currentCardKey):deck;
