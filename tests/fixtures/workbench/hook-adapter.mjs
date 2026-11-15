import { prepare as prepareFixture, observe } from './adapter.mjs';
export { observe };
export async function beforeNavigate(page) {
  await page.route('**/fixture.html', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('</body>', '<script>window.__interceptedFirstNavigation = true</script></body>');
    await route.fulfill({response, body});
  });
}
export async function prepare(page, c) {
  await prepareFixture(page, c);
  if (!await page.evaluate(() => window.__interceptedFirstNavigation === true)) throw Error('beforeNavigate did not intercept initial request');
}
