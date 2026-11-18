import { defineConfig, bindings, exports } from 'cf/config';

const c1Config = {
  worker: {
    name: 'poke-arena-realtime',
    entrypoint: 'src/index.js',
    compatibilityDate: '2026-11-13',
    exports: {
      ArenaLobby: exports.durableObject({ storage: 'sqlite' }),
      ArenaRoom: exports.durableObject({ storage: 'sqlite' }),
    },
    env: {
      LOBBY: bindings.durableObject({ worker: 'poke-arena-realtime', exportName: 'ArenaLobby' }),
      ARENAS: bindings.durableObject({ worker: 'poke-arena-realtime', exportName: 'ArenaRoom' }),
      ALLOWED_ORIGINS: bindings.text('https://poke-arena-erick.eriqrb.chatgpt.site,https://poke-arena-web.eriickramiirez.workers.dev,http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:4177'),
    },
    observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.1 } },
  },
};

const c4Config = {
  worker: {
    ...c1Config.worker,
    name: 'poke-arena-realtime-c4',
    env: {
      LOBBY: bindings.durableObject({ worker: 'poke-arena-realtime-c4', exportName: 'ArenaLobby' }),
      ARENAS: bindings.durableObject({ worker: 'poke-arena-realtime-c4', exportName: 'ArenaRoom' }),
      ALLOWED_ORIGINS: bindings.text('https://poke-arena-web.eriickramiirez.workers.dev'),
      ONLINE_SERVICE: bindings.text('c4'),
      C4_NEW_SEARCHES: bindings.text('1'),
      C4_EEVEE_NEW_SEARCHES: bindings.text('1'),
    },
  },
};
export default defineConfig(({mode}) => mode === 'c4-production' ? c4Config : c1Config);
