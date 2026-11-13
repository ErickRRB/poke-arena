import { defineConfig, bindings, exports } from 'cf/config';

export default defineConfig({
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
      ALLOWED_ORIGINS: bindings.text('https://poke-arena-erick.eriqrb.chatgpt.site,http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:4177'),
    },
    observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.1 } },
  },
});
