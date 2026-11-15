export const ONLINE_SERVER = 'https://poke-arena-realtime.eriickramiirez.workers.dev';
export const PUBLIC_ASSET_ORIGIN='https://poke-arena-web.eriickramiirez.workers.dev';
function ownVersionOrigin(location){
  if(!location?.origin||!location.hostname)return false;
  const canonicalHost=new URL(PUBLIC_ASSET_ORIGIN).hostname,suffix='-'+canonicalHost;
  if(!location.hostname.endsWith(suffix))return false;
  const prefix=location.hostname.slice(0,-suffix.length);
  try{return /^[a-z0-9][a-z0-9-]*$/.test(prefix)&&new URL(location.origin).protocol==='https:'&&new URL(location.origin).hostname===location.hostname;}catch{return false;}
}
export function publicAssetUrl(file,location=globalThis.location){
  if(!location||['localhost','127.0.0.1','::1','[::1]'].includes(location.hostname)||location.origin===PUBLIC_ASSET_ORIGIN||ownVersionOrigin(location))return file;
  // An uploaded version must use its own asset manifest while it is reviewed.
  // Only this Worker's version/alias hostname qualifies; legacy keeps CF assets.
  // Legacy pages keep their saved decks at their original origin. New public
  // media comes directly from Cloudflare, without changing or updating Sites.
  return new URL(file,PUBLIC_ASSET_ORIGIN+'/').href;
}
export function onlineServer(location = globalThis.location) {
  return location && ['localhost', '127.0.0.1'].includes(location.hostname) ? location.protocol + '//' + location.hostname + ':4180' : ONLINE_SERVER;
}
