import assert from 'node:assert/strict';
import {openPage,ready,rects,stable,inViewport} from './helpers.mjs';

export async function run({browser,url,viewports,output}){
  for(const viewport of viewports){
    const{context,page,errors,apiRequests}=await openPage(browser,viewport,{deckOnly:true});
    try{
      await page.goto(url);await ready(page);await page.locator('#menu-deck-btn').click();
      const cards=await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>({row:node.offsetTop,width:node.offsetWidth,height:node.offsetHeight})));
      assert.equal(cards.length,8);assert.equal(new Set(cards.map(card=>card.row)).size,2);assert.ok(cards.every(card=>card.width>55&&Math.abs(card.width/card.height-.8)<.02));
      assert.equal(await page.locator('[data-collection]').count(),109);await inViewport(page,'#save-deck-btn',viewport);
      assert.equal(await page.locator('#deck-section-title').innerText(),'Mi mazo');assert.equal(await page.locator('#collection-section-title').innerText(),'Mi colección');
      assert.equal(await page.locator('[data-collection=pikachu] .card-role').innerText(),'Mago eléctrico');assert.equal(await page.locator('[data-collection=onix] .card-role').innerText(),'Parcial de Montapuercos');
      assert.equal(await page.locator('[data-collection=squirtle] .card-role').count(),0);assert.equal(await page.locator('[data-collection=exeggutor]').count(),0);
      assert.equal(await page.locator('[data-collection=vivero] .cost-value').innerText(),'3');
      const chosen=await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>node.dataset.deckInfo));
      assert.deepEqual(await page.locator('#collection .selected').evaluateAll(nodes=>nodes.map(node=>node.dataset.collection).sort()),[...chosen].sort());
      const selectedStyle=await page.locator('[data-collection=pikachu]').evaluate(node=>({border:getComputedStyle(node).outlineColor,badge:getComputedStyle(node,'::after').content}));
      assert.equal(selectedStyle.border,'rgb(49, 132, 97)');assert.ok(selectedStyle.badge.includes('✓'));
      await page.locator('[data-collection=rayquaza]').scrollIntoViewIfNeeded();await page.locator('#save-deck-btn').click();await page.locator('#menu-deck-btn').click();
      assert.equal(await page.locator('#deck-scroll').evaluate(node=>node.scrollTop),0,'opening the editor starts with the active deck');
      assert.deepEqual(await page.locator('#deck-strip [data-deck-info]').evaluateAll(nodes=>nodes.map(node=>node.dataset.deckInfo)),chosen);
      await page.locator('[data-collection=rayquaza]').scrollIntoViewIfNeeded();await page.locator('#deck-slots [data-deck-slot="1"]').click();
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
  return{viewports:viewports.length,onlineRequests:0};
}
