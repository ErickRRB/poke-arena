import {defineConfig,bindings} from 'cf/config';
export default defineConfig({
 worker:{
  name:'poke-arena-web',
  entrypoint:'src/index.js',
  compatibilityDate:'2026-11-14',
  assets:{runWorkerFirst:true,htmlHandling:'none',notFoundHandling:'none'},
  env:{ASSETS:bindings.assets()},
  observability:{enabled:true,traces:{enabled:true,headSamplingRate:0.1}},
 },
});
