export const ONLINE_SERVER = 'https://poke-arena-realtime.eriickramiirez.workers.dev';
export function onlineServer(location = globalThis.location) {
  return location && ['localhost', '127.0.0.1'].includes(location.hostname) ? location.protocol + '//' + location.hostname + ':4180' : ONLINE_SERVER;
}
