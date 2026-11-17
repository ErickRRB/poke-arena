export {checkC4LibraryDeck as checkLocalCpuDeck} from './profile-selection.js?v=1';
export function isLocalC4CpuPreview(value){
  let url;try{url=new URL(value);}catch{return false;}
  return ['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.searchParams.get('preview')==='c4-cpu-1';
}
