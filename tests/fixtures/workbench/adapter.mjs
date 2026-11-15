export async function prepare(page) { await page.waitForFunction(() => window.fixture); }
export async function observe(page, config) {
  const observed = await page.evaluate(() => { const c=document.querySelector('canvas'), r=c.getBoundingClientRect(), f=window.fixture; return { wallTime:performance.now(),epochMs:performance.timeOrigin+performance.now(), gameTime:f.time, viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,canvas:{x:r.x,y:r.y,width:r.width,height:r.height,pixelWidth:c.width,pixelHeight:c.height},pose:f.pose,hp:f.hp,events:f.events }; });
  if (config.devForceMismatch) observed.dpr += 1;
  return observed;
}
