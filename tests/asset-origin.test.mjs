import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicAssetUrl,PUBLIC_ASSET_ORIGIN} from '../dist/online-config.js';

test('canonical, local and this Worker version URLs retain their own relative assets',()=>{
  for(const origin of[PUBLIC_ASSET_ORIGIN,'http://localhost:4202','http://127.0.0.1:4202','http://[::1]:4202','https://829de29a-poke-arena-web.eriickramiirez.workers.dev','https://review-fire-poke-arena-web.eriickramiirez.workers.dev']){
    const location=new URL(origin);
    for(const file of['./canvas-raster.js?v=36','./fire-material.js?v=37','assets/pokemon/6/Shoot-Anim.png','assets/audio/music/rynos-theme.mp3'])assert.equal(publicAssetUrl(file,location),file,origin+' '+file);
  }
});

test('legacy and unrelated hosts resolve new media to canonical CF, without changing their origin',()=>{
  for(const origin of['https://poke-arena-erick.eriqrb.chatgpt.site','https://some-other-worker.eriickramiirez.workers.dev','https://review-poke-arena-web.someone-else.workers.dev','https://review-poke-arena-web.eriickramiirez.workers.dev.attacker.test','http://review-poke-arena-web.eriickramiirez.workers.dev']){
    const location=new URL(origin),before=location.href;
    assert.equal(publicAssetUrl('./fire-material.js?v=37',location),PUBLIC_ASSET_ORIGIN+'/fire-material.js?v=37');
    assert.equal(location.href,before);
  }
});
