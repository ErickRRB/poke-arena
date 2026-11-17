import assert from 'node:assert/strict';
import {openPage,ready,rects,stable,inViewport} from './helpers.mjs';

export async function run({browser,url,viewports,output}){
  for(const viewport of viewports){
    const{context,page,errors,apiRequests}=await openPage(browser,viewport,{deckOnly:true});
    try{
      await page.goto(url);await ready(page);await page.locator('#menu-deck-btn').click();
      const cards=await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>({row:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight})));
      assert.equal(cards.length,8);assert.equal(new Set(cards.map(card=>card.row)).size,2);assert.ok(cards.every(card=>card.width>55&&Math.abs(card.width/card.height-.8)<.02));
      assert.equal(await page.locator('[data-collection]').count(),46,'only approved representatives are offered for new selection');await inViewport(page,'#save-deck-btn',viewport);
      assert.equal(await page.locator('#deck-section-title').innerText(),'Mi mazo');assert.equal(await page.locator('#collection-section-title').innerText(),'Mi colección');
      assert.equal(await page.locator('[data-collection=pikachu] .card-role').innerText(),'Mago eléctrico');assert.equal(await page.locator('[data-collection=onix]').count(),0);assert.equal(await page.locator('[data-collection=rayquaza]').count(),0);
      assert.equal(await page.locator('[data-collection=squirtle]').count(),0);assert.equal(await page.locator('[data-collection=exeggutor]').count(),0);
      assert.equal(await page.locator('[data-collection=vivero] .cost-value').innerText(),'3');
      assert.equal(await page.locator('[data-collection=ampharos] .cost-value').innerText(),'4');assert.equal(await page.locator('[data-collection=ampharos] .card-role').innerText(),'Tesla');
      assert.equal(await page.locator('[data-collection=pandilla] .card-role').innerText(),'Pandilla de duendes');assert.ok((await page.locator('[data-collection=pandilla] .card-quantity').innerText()).includes('6'));
      assert.equal(await page.locator('[data-collection=rhydon] .card-role').innerText(),'P.E.K.K.A.');assert.equal(await page.locator('[data-collection=registeel]').count(),0);
      const chosen=await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>node.dataset.deckInfo));
      assert.deepEqual(await page.locator('#collection .selected').evaluateAll(nodes=>nodes.map(node=>node.dataset.collection).sort()),[...chosen].sort());
      const selectedStyle=await page.locator('[data-collection=pikachu]').evaluate(node=>({border:getComputedStyle(node).outlineColor,badge:getComputedStyle(node,'::after').content}));
      assert.equal(selectedStyle.border,'rgb(49, 132, 97)');assert.ok(selectedStyle.badge.includes('✓'));
      await page.locator('[data-collection=typhlosion]').scrollIntoViewIfNeeded();await page.locator('#save-deck-btn').click();await page.locator('#menu-deck-btn').click();
      assert.equal(await page.locator('#deck-scroll').evaluate(node=>node.scrollTop),0,'opening the editor starts with the active deck');
      assert.deepEqual(await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>node.dataset.deckInfo)),chosen);
      await page.locator('[data-collection=typhlosion]').scrollIntoViewIfNeeded();await page.locator('#deck-slots [data-deck-slot="1"]').click();
      assert.equal(await page.locator('#deck-scroll').evaluate(node=>node.scrollTop),0,'switching decks brings the selected deck into view');
      await page.locator('#deck-slots [data-deck-slot="0"]').click();
      assert.deepEqual(await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>node.dataset.deckInfo)),chosen);
      await page.locator('[data-deck-info=pikachu]').click();assert.equal(await page.locator('#card-dialog').isVisible(),false);await inViewport(page,'#card-actions',viewport);
      await page.keyboard.press('Escape');assert.equal(await page.locator('#deck-dialog').isVisible(),true);
      await page.locator('[data-deck-info=pikachu]').click();await page.locator('#card-action-info').click();await page.locator('#card-dialog').waitFor({state:'visible'});await page.locator('#card-dialog [data-close]').click();
      const before=await rects(page,['deck-scroll','save-deck-btn']);await page.locator('#collection-filters-btn').click();stable(before,await rects(page,['deck-scroll','save-deck-btn']),'filters');
      assert.equal(await page.locator('.rarity-options').evaluate(node=>node.open),false);await page.locator('#collection-search').fill('Princesa');assert.equal(await page.locator('[data-collection]').count(),1);assert.equal(await page.locator('[data-collection=roselia] .card-role').innerText(),'Princesa');await page.locator('#collection-search').fill('sandshrew');assert.equal(await page.locator('[data-collection]').count(),1);
      const count=await page.locator('[data-collection=sandshrew]').evaluate(node=>{const name=node.querySelector('.card-name'),quantity=node.querySelector('.card-quantity');return{below:quantity.getBoundingClientRect().top>=name.getBoundingClientRect().bottom,background:getComputedStyle(quantity).backgroundColor};});
      assert.ok(count.below);assert.equal(count.background,'rgba(0, 0, 0, 0)');await page.locator('#apply-filters-btn').click();
      await page.locator('[data-collection=sandshrew]').click();await page.locator('#card-action-toggle').click();await page.locator('#deck-replace-hint').waitFor({state:'visible'});await page.locator('[data-deck-info=pikachu]').click();
      assert.equal(await page.locator('#deck-strip [data-deck-info]').count(),8);assert.equal(await page.locator('[data-collection=sandshrew]').evaluate(node=>node.classList.contains('selected')),true);await page.locator('[data-deck-info=sandshrew]').click();await page.locator('#card-action-toggle').click();assert.equal(await page.locator('#deck-strip [data-deck-info]').count(),7);assert.equal(await page.locator('[data-collection=sandshrew]').evaluate(node=>node.classList.contains('selected')),false);
      await page.locator('#collection-filters-btn').click();await page.locator('#reset-filters-btn').click();await page.locator('#apply-filters-btn').click();
      await page.locator('#deck-scroll').evaluate(node=>node.scrollTop=document.querySelector('.deck-top').offsetHeight+8);
      const deck=await page.locator('#deck-strip').boundingBox(),pane=await page.locator('#deck-scroll').boundingBox();assert.ok(deck.y+deck.height<=pane.y+2);
      await page.locator('[data-collection=pikachu]').scrollIntoViewIfNeeded();await page.locator('[data-collection=pikachu]').click();await page.locator('#card-action-toggle').click();
      await page.locator('#save-deck-btn').click();await page.reload();await ready(page);await page.locator('#menu-deck-btn').click();assert.equal(await page.locator('#deck-strip [data-deck-info]').count(),8);
      await page.screenshot({path:`${output}/deck-${viewport.width}.png`});assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[],'deck tests must never create sessions or contact online play');
    }finally{await context.close();}
  }
  const viewport={width:390,height:844},fixture={version:1,active:0,slots:[['pikachu',null,'blastoise','charizard','squirtle','rhydon','registeel','pikachu'],['onix','rapidash','blastoise','exeggutor'],[],null],updatedAt:100},legacy=['gastly','shuppet','pikachu','charmander','squirtle','onix','rapidash','registeel'];
  const{context,page,errors,apiRequests}=await openPage(browser,viewport,{deckOnly:true});
  try{
    await page.addInitScript(({fixture,legacy})=>{if(!sessionStorage.getItem('deck-fixture-initialized')){localStorage.setItem('poke-arena:deck-slots',JSON.stringify(fixture));localStorage.setItem('poke-arena:deck',JSON.stringify(legacy));sessionStorage.setItem('deck-fixture-initialized','1');}}, {fixture,legacy});
    await page.goto(url);await page.waitForFunction(()=>globalThis.__qa&&document.querySelector('#menu-loading')?.hidden);
    const original=await page.evaluate(()=>({slots:localStorage.getItem('poke-arena:deck-slots'),legacy:localStorage.getItem('poke-arena:deck')}));
    assert.equal(original.slots,JSON.stringify(fixture));assert.equal(original.legacy,JSON.stringify(legacy));
    assert.equal(await page.locator('#start-btn').isDisabled(),true,'an inactive or incomplete saved deck cannot start a new match');
    await page.locator('#menu-deck-btn').click();
    assert.equal(await page.locator('#deck-strip [data-deck-info]').count(),6,'the historical alias, hole, and inactive cards remain in their original positions');
    await page.locator('#deck-slots [data-deck-slot="1"]').click();
    const selected=await page.evaluate(()=>localStorage.getItem('poke-arena:deck-slots')),chosen=JSON.parse(selected),cookie=(await context.cookies()).find(c=>c.name==='poke_arena_decks');
    assert.equal(chosen.active,1);assert.deepEqual(chosen.slots,fixture.slots);assert.equal(JSON.parse(decodeURIComponent(cookie.value)).active,1);assert.deepEqual(JSON.parse(decodeURIComponent(cookie.value)).slots,fixture.slots);
    await page.reload();await page.waitForFunction(()=>globalThis.__qa&&document.querySelector('#menu-loading')?.hidden);assert.equal(await page.evaluate(()=>localStorage.getItem('poke-arena:deck-slots')),selected);assert.equal(await page.locator('#menu-deck-slots [data-deck-slot="1"]').getAttribute('aria-pressed'),'true');
    await page.locator('#menu-deck-btn').click();
    assert.equal(await page.locator('#deck-strip [data-deck-info=vivero]').count(),1,'an approved compatible alias is shown ephemerally as its representative');
    assert.equal(await page.locator('#deck-strip [data-deck-info=vivero]').getAttribute('data-saved-key'),'exeggutor','the compatible alias remains raw in its saved slot until explicit editing');
    await page.locator('[data-collection=snorlax]').click();await page.locator('#card-action-toggle').click();
    const after=await page.evaluate(()=>({library:JSON.parse(localStorage.getItem('poke-arena:deck-slots')),legacy:localStorage.getItem('poke-arena:deck')}));
    assert.equal(after.library.active,1);assert.deepEqual(after.library.slots[0],fixture.slots[0],'editing slot 2 leaves the historical slot 1 byte structure intact');
    assert.deepEqual(after.library.slots[1],['onix','rapidash','blastoise','exeggutor','snorlax',null,null,null],'the selected eligible card fills the next empty position without compacting prior positions');
    assert.deepEqual(after.library.slots.slice(2),[[],null],'other saved decks remain unchanged');
    assert.equal(after.legacy,original.legacy,'editing a different slot does not overwrite the old single-deck payload');
    assert.equal(await page.locator('#start-btn').isDisabled(),true,'remaining inactive cards still block a new match');
    await page.locator('#deck-strip [data-deck-info=onix]').click();await page.locator('#card-action-toggle').click();
    const removed=await page.evaluate(()=>JSON.parse(localStorage.getItem('poke-arena:deck-slots')));
    assert.deepEqual(removed.slots[1],[null,'rapidash','blastoise','exeggutor','snorlax',null,null,null],'removing an inactive card is explicit, leaves a hole, and preserves the compatible raw alias');
    assert.deepEqual(removed.slots[0],fixture.slots[0]);
    assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);
  }finally{await context.close();}
  const replay=await openPage(browser,{width:390,height:844},{serviceWorkers:'block',deviceScaleFactor:1});
  try{
    const invalid={version:1,active:0,slots:[['pikachu',null,'blastoise','charizard','squirtle','rhydon','registeel','pikachu'],null,null,null],updatedAt:100};
    await replay.page.addInitScript(invalid=>localStorage.setItem('poke-arena:deck-slots',JSON.stringify(invalid)),invalid);
    await replay.page.goto(url);await replay.page.waitForFunction(()=>globalThis.__qa&&document.querySelector('#menu-loading')?.hidden);
    const saved=await replay.page.evaluate(()=>localStorage.getItem('poke-arena:deck-slots'));
    await replay.page.locator('#practice-btn').click();assert.equal(await replay.page.evaluate(()=>__qa.game.tutorial),true);
    await replay.page.evaluate(()=>__qa.game.finish(0,'Resultado controlado'));await replay.page.locator('#again-btn').click();
    assert.equal(await replay.page.locator('#deck-dialog').isVisible(),true);assert.equal(await replay.page.locator('#deck-selection-notice').isVisible(),true);
    assert.equal(await replay.page.evaluate(()=>__qa.game.state),'ready');assert.equal(await replay.page.evaluate(()=>localStorage.getItem('poke-arena:deck-slots')),saved);assert.deepEqual(replay.errors,[]);
  }finally{await replay.context.close();}
  const lab={width:390,height:844},labPage=await openPage(browser,lab,{deckOnly:true});
  try{
    await labPage.page.goto(new URL('/testing.html?card=charmander',url).href);
    await labPage.page.waitForFunction(()=>globalThis.arenaLab?.ready);
    assert.notEqual(await labPage.page.locator('#chosen-name').innerText(),'Charmander','an inactive direct-query card is not selected in the lab');
    assert.equal(await labPage.page.locator('option[value=charmander]').count(),0,'inactive cards are absent from lab presets');
    await labPage.page.locator('#choose-card').click();await labPage.page.locator('#card-search').fill('Charmander');
    assert.equal(await labPage.page.locator('#picker-list [data-pick]').count(),0,'inactive cards are absent from the lab picker');
    assert.equal(await labPage.page.evaluate(()=>arenaLab.choose('charmander')),false,'the lab action guard also rejects direct selection');
    assert.deepEqual(labPage.errors,[]);assert.deepEqual(labPage.apiRequests,[]);
  }finally{await labPage.context.close();}
  return{viewports:viewports.length,onlineRequests:0,historicalDeckIndexEdit:true,labInactiveQuery:true};
}
