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

  // ---- the AI's speaking budget (default): plenty of dry texts, few AI lines, never two AI turns in a row
  for (const [i, t] of ['k', 'ok', 'fine', 'sure', 'hmm', 'k', 'ok', 'fine'].entries()) {
    if (i % 2) { await box(riya).fill(t); await riya.getByRole('button', { name: 'Send' }).click(); } else { await box(aman).fill(t); await box(aman).press('Enter'); }
    await sleep(450);
  }
  await sleep(1500);
  const seq = await aman.getByRole('log').evaluate((log) => [...log.children].map((c) => (c.matches('[data-ai-line]') ? 'A' : c.matches('.group') ? 'H' : 'x')).join(''));
  const aiCount = (seq.match(/A/g) ?? []).length;
  const quiet = await aman.getByRole('log').locator('[title="the AI reacted"]').count();
  console.log(`budget: 8 dry texts -> ${aiCount} AI lines (${seq}), ${quiet} quiet emoji reactions`);
  assert.ok(aiCount >= 1 && aiCount <= 3, seq);
  assert.ok(!seq.includes('AA'), 'never two AI turns in a row');
  assert.ok(quiet >= 4, 'the rest got a quiet emoji');
  await box(aman).fill('67'); await box(aman).press('Enter');

  // ---- breaking news + sticker + gif, live on the other client
  await riya.getByRole('status').filter({ hasText: /Breaking/ }).waitFor({ timeout: 6000 });
  console.log('BREAKING banner on a live 67:', (await riya.getByRole('status').filter({ hasText: /Breaking/ }).innerText()).replace(/\n/g, ' '));
  await riya.screenshot({ path: `${SHOTS}/d1-mobile-breaking.png` });
  await aman.locator('[data-ai-line] span.text-3xl', { hasText: '🗿' }).first().waitFor({ timeout: 4000 });
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

  // ---- Groq vs Ollama duel (admin toggle)
  await admin.getByRole('switch', { name: /AI duel: Groq vs Ollama/ }).click();
  await admin.getByLabel('AI speaks every N human messages').focus(); await admin.keyboard.press('Home');
  await sleep(500);
  await box(aman).fill("wait I'll reply later"); await box(aman).press('Enter');
  await aman.getByRole('log').getByText(/MOCK-OLLAMA/).first().waitFor({ timeout: 8000 });
  const sides = await aman.getByRole('log').locator('[data-ai-label]').evaluateAll((els) => els.slice(-2).map((e) => e.textContent));
  console.log('duel turn:', sides.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '));
  assert.ok(/Groq/.test(sides[0]) && /Ollama Cloud/.test(sides[1]), 'Groq speaks, Ollama answers');
  // a lull follows people talking: banter never starts right after an AI turn (that would be two in a row)
  await box(riya).fill('see you all at eight'); await riya.getByRole('button', { name: 'Send' }).click(); await sleep(600);
  await admin.getByRole('button', { name: '+5m' }).click();
  await aman.getByRole('log').locator('[data-ai-label]', { hasText: /ai vs ai/ }).nth(2).waitFor({ timeout: 10000 });
  const banter = await aman.getByRole('log').locator('[data-ai-label]', { hasText: /ai vs ai/ }).allInnerTexts();
  console.log('lull banter:', banter.map((t) => t.replace(/\s+/g, ' ').trim()).join(' | '));
  assert.equal(banter.length, 3);
  await aman.screenshot({ path: `${SHOTS}/d3-duel.png` });
  console.log('mobile overflow px:', await riya.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('UI-D FAILED:', e.message.split('\n').slice(0, 7).join('\n')); console.error(errors.join('\n')); process.exit(1); });
