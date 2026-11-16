export function readAudioLevels(read){
  const legacy=read('game-volume',100);
  return {music:read('music-volume',50),voices:read('voices-volume',legacy),effects:read('effects-volume',legacy)};
}
