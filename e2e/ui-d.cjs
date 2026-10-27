const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const SHOTS = process.env.SHOTS ?? require('node:path').join(__dirname, 'shots');
require('node:fs').mkdirSync(SHOTS, { recursive: true });
const WEB = process.env.WEB ?? 'http://localhost:3010';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (p, n) => { p.on('console', (m) => m.type() === 'error' && !/giphy|ERR_|Failed to load resource/.test(m.text()) && errors.push(`[${n}] ${m.text()}`)); p.on('pageerror', (e) => errors.push(`[${n}] pageerror ${e.message}`)); };
const box = (p) => p.getByRole('textbox', { name: 'Message' });
const join = async (browser, code, name, opts = {}) => {
  const page = await (await browser.newContext({ reducedMotion: 'reduce', ...opts })).newPage(); watch(page, name);
  await page.goto(`${WEB}/r/${code}`); await page.getByLabel('your name').fill(name);
  await page.getByRole('button', { name: /tap to enter/i }).click(); await page.getByRole('log').waitFor();
  return page;
};

(async () => {
  const browser = await chromium.launch();
  const aman = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage(); watch(aman, 'aman');
  await aman.goto(WEB); await aman.getByRole('button', { name: /start a room/i }).click(); await aman.waitForURL(/\/r\/[A-Z]{4}$/);
  const code = aman.url().split('/').pop();
  await aman.getByLabel('your name').fill('Aman'); await aman.getByRole('button', { name: /tap to enter/i }).click(); await aman.getByRole('log').waitFor();
  const riya = await join(browser, code, 'Riya', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addInitScript(() => sessionStorage.setItem('cooked.adminKey', 'letmein'));
  const admin = await actx.newPage(); await admin.goto(`${WEB}/admin/${code}`);

  assert.equal(await riya.getByText('Breaking').count(), 0, 'no banner before anything happens');
  await box(aman).fill('67'); await box(aman).press('Enter');

  // ---- breaking news + sticker + gif, live on the other client
  await riya.getByRole('status').filter({ hasText: /Breaking/ }).waitFor({ timeout: 6000 });
  console.log('BREAKING banner on a live 67:', (await riya.getByRole('status').filter({ hasText: /Breaking/ }).innerText()).replace(/\n/g, ' '));
  await riya.screenshot({ path: `${SHOTS}/d1-mobile-breaking.png` });
  await aman.locator('span.text-5xl', { hasText: '🗿' }).first().waitFor({ timeout: 4000 });
  console.log('sticker tile shown on the 67 moment');
  const gif = aman.locator('img[alt="reaction gif"]').first();
  await gif.waitFor({ state: 'attached', timeout: 6000 });
  assert.equal(await gif.getAttribute('src'), 'https://media1.giphy.com/media/mock/200.gif');
  console.log('GIF attached from the (mock) GIPHY lookup, https giphy.com only');

  // ---- banner auto-hides, and a late joiner is NOT shown old headlines
  await riya.getByRole('status').filter({ hasText: /Breaking/ }).waitFor({ state: 'detached', timeout: 9000 });
  const late = await join(browser, code, 'Late', { viewport: { width: 1280, height: 800 } });
  await sleep(2500);
  assert.equal(await late.getByText(/^Breaking$/i).count(), 0, 'history is not replayed as breaking news');
  console.log('late joiner sees no replayed headline');

  // ---- daily tiers across a day rollover (needs two members with messages)
  await box(riya).fill('hello from riya'); await riya.getByRole('button', { name: 'Send' }).click();
  await aman.getByText('hello from riya').first().waitFor();
  await admin.getByRole('button', { name: '+12h' }).click(); await sleep(300);
  await admin.getByRole('button', { name: '+12h' }).click(); await sleep(300);
  await admin.getByRole('button', { name: '+12h' }).click();
  await aman.getByText(/Daily status update:/).first().waitFor({ timeout: 8000 });
  console.log('daily tiers:', (await aman.getByText(/Daily status update:/).first().innerText()).slice(0, 110));
  await aman.getByRole('log').getByText(/daily tiers/i).first().waitFor();
  await aman.screenshot({ path: `${SHOTS}/d2-desktop.png` });

  console.log('mobile overflow px:', await riya.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('UI-D FAILED:', e.message.split('\n').slice(0, 7).join('\n')); console.error(errors.join('\n')); process.exit(1); });
