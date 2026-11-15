export const ONLINE_SERVER = 'https://poke-arena-realtime.eriickramiirez.workers.dev';
export const PUBLIC_ASSET_ORIGIN='https://poke-arena-web.eriickramiirez.workers.dev';
export function publicAssetUrl(file,location=globalThis.location){
  if(!location||['localhost','127.0.0.1','::1'].includes(location.hostname)||location.origin===PUBLIC_ASSET_ORIGIN)return file;
  // Legacy pages keep their saved decks at their original origin. New public
  // media comes directly from Cloudflare, without changing or updating Sites.
  return new URL(file,PUBLIC_ASSET_ORIGIN+'/').href;
}
export function onlineServer(location = globalThis.location) {
  return location && ['localhost', '127.0.0.1'].includes(location.hostname) ? location.protocol + '//' + location.hostname + ':4180' : ONLINE_SERVER;
}
