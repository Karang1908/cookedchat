const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const SHOTS = process.env.SHOTS ?? require('node:path').join(__dirname, 'shots');
require('node:fs').mkdirSync(SHOTS, { recursive: true });
const WEB = process.env.WEB ?? 'http://localhost:3010';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (p, n) => { p.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|giphy/i.test(m.text()) && errors.push(`[${n}] ${m.text()}`)); p.on('pageerror', (e) => errors.push(`[${n}] pageerror ${e.message}`)); };
/** a real pointer click at the element's centre: raw input events, no actionability layer */
const realClick = async (page, loc) => {
  await loc.waitFor(); await page.waitForTimeout(350);
  const b = await loc.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(400);
};
const box = (p) => p.getByRole('textbox', { name: 'Message' });
/** pixel stats of an <img>: size + how many distinct colors it has (a blank image has ~1) */
const imgInfo = (page, sel) => page.locator(sel).evaluate(async (img) => {
  await img.decode();
  const c = document.createElement('canvas'); c.width = 120; c.height = Math.round(120 * img.naturalHeight / img.naturalWidth);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data; const set = new Set();
  for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
  return { w: img.naturalWidth, h: img.naturalHeight, colors: set.size };
});

(async () => {
  const browser = await chromium.launch();
  const aman = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, reducedMotion: 'reduce' })).newPage(); watch(aman, 'aman');
  await aman.goto(WEB); await aman.getByRole('button', { name: /start a room/i }).click(); await aman.waitForURL(/\/r\/[A-Z]{4}$/);
  const code = aman.url().split('/').pop();
  await aman.getByLabel('your name').fill('Aman'); await aman.getByRole('button', { name: /tap to enter/i }).click(); await aman.getByRole('log').waitFor();
  const riya = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })).newPage(); watch(riya, 'riya');
  await riya.goto(`${WEB}/r/${code}`); await riya.getByLabel('your name').fill('Riya'); await riya.getByRole('button', { name: /tap to enter/i }).click(); await riya.getByRole('log').waitFor();
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addInitScript(() => sessionStorage.setItem('cooked.adminKey', 'letmein'));
  const admin = await actx.newPage(); watch(admin, 'admin');
  await admin.goto(`${WEB}/admin/${code}`);
  // these flows test individual roasts, so switch the AI's speaking budget off (what you would do on stage)
  await admin.getByLabel('AI speaks every N human messages').focus(); await admin.keyboard.press('Home'); await sleep(250);
  await admin.getByRole('button', { name: /add Aman, Riya/i }).click(); await sleep(300);
  await admin.getByRole('button', { name: 'demo speed' }).click(); await sleep(300);

  // some history: a dry text, a hungry message, a 67 (lore), an Ohio message
  await box(aman).fill('k'); await box(aman).press('Enter');
  await riya.getByText('k', { exact: true }).first().waitFor();
  await box(aman).fill("I'm hungry"); await box(aman).press('Enter');
  await box(aman).fill('67'); await box(aman).press('Enter');
  await sleep(1500);
  await box(aman).fill('SKIBIDI OHIO SIGMA RIZZ FANUM TAX!!!! 💀💀💀💀'); await box(aman).press('Enter');
  await riya.getByText(/SKIBIDI/).first().waitFor();

  // ---- 1. translators (dry meaning is rule-based and exact)
  const kRow = riya.locator('div.group').filter({ has: riya.locator('div.whitespace-pre-wrap', { hasText: /^k$/ }) }).first();
  await kRow.getByRole('button', { name: 'Translate' }).click();
  await realClick(riya, riya.getByRole('menuitem', { name: /what they really meant/ }));
  await riya.getByText('I am deeply wounded').first().waitFor({ timeout: 5000 });
  console.log('dry translator: "k" = I am deeply wounded');
  const hungryRow = aman.locator('div.group', { hasText: "I'm hungry" }).first();
  assert.equal(await hungryRow.getByRole('button', { name: 'Translate' }).count(), 1);
  await hungryRow.getByRole('button', { name: 'Translate' }).click();
  assert.equal(await aman.getByRole('menuitem', { name: /what they really meant/ }).count(), 0, 'dry option only for dry texts');
  await realClick(aman, aman.getByRole('menuitem', { name: /to brainrot/ }));
  await hungryRow.getByRole('note').waitFor({ timeout: 6000 });
  console.log('brainrot translation shown:', (await hungryRow.getByRole('note').innerText()).replace(/\n/g, ' ').slice(0, 80));

  // ---- 2. meme: real PNG at 1080x1080 with actual content
  const ohioRow = aman.locator('div.group', { hasText: 'SKIBIDI' }).first();
  await ohioRow.getByRole('button', { name: 'Make a meme' }).click();
  await aman.locator('img[alt^="Meme:"]').first().waitFor({ timeout: 8000 });
  const meme = await imgInfo(aman, 'img[alt^="Meme:"]');
  console.log('meme image:', meme);
  assert.deepEqual([meme.w, meme.h], [1080, 1080]); assert.ok(meme.colors > 30, 'meme is not blank');
  const dl = aman.waitForEvent('download');
  await aman.getByRole('button', { name: 'Share image' }).first().click();
  const d = await dl;
  console.log('share fell back to a download:', d.suggestedFilename());
  assert.equal(d.suggestedFilename(), 'cooked-meme.png');
  await ohioRow.getByRole('button', { name: 'Make a meme' }).click();
  await aman.getByText(/meme printer is warming up/).first().waitFor({ timeout: 3000 });
  console.log('meme rate limit reason shown');

  // ---- 3. Wrapped
  await aman.getByRole('radio', { name: 'Games', exact: true }).click(); // desktop: games live behind the Games tab
  await aman.getByRole('button', { name: /my Brainrot Wrapped/ }).click();
  await aman.getByText(/You are \d+% /).first().waitFor({ timeout: 6000 });
  await aman.locator('img[alt$="Brainrot Wrapped card"]').first().waitFor();
  const wrapped = await imgInfo(aman, 'img[alt$="Brainrot Wrapped card"]');
  console.log('wrapped image:', wrapped);
  assert.deepEqual([wrapped.w, wrapped.h], [1080, 1350]); assert.ok(wrapped.colors > 40);
  const pcts = (await aman.getByText(/You are \d+% /).first().innerText()).match(/\d+(?=%)/g).map(Number);
  assert.equal(pcts.reduce((a, b) => a + b, 0), 100);
  const postRiya = () => aman.getByRole('button', { name: /post Riya's Brainrot Wrapped/i }).click();
  await aman.getByRole('button', { name: 'Riya profile' }).first().click();
  await postRiya();
  await aman.getByRole('alert').filter({ hasText: /one Wrapped at a time/ }).waitFor({ timeout: 4000 });
  console.log('1) rate-limited Wrapped explains itself in the dialog');
  await sleep(10_500);
  await postRiya();
  await aman.getByRole('alert').filter({ hasText: /Riya has not said anything yet/ }).waitFor({ timeout: 4000 });
  console.log('2) "nothing to wrap" is explained when the member has not spoken');
  await box(riya).fill('hello from riya'); await riya.getByRole('button', { name: 'Send' }).click();
  await aman.getByText('hello from riya').first().waitFor();
  await postRiya();
  const t0 = Date.now();
  await aman.locator('img[alt="Riya\'s Brainrot Wrapped card"]').waitFor({ timeout: 20_000 });
  console.log(`   (wrapped image rendered ${Date.now() - t0}ms after the request; software canvas in a busy sandbox is slow)`);
  await aman.getByRole('dialog').waitFor({ state: 'detached', timeout: 3000 });
  console.log('3) wrapped for someone else from their profile ok; dialog closed');

  // ---- 4. awards + recap
  await aman.getByRole('button', { name: /chat awards/ }).click();
  await aman.getByText(/Ohio Resident|NPC Energy|Main Character/).first().waitFor({ timeout: 6000 });
  console.log('awards:', (await aman.locator('li', { hasText: /Ohio Resident|NPC Energy|Main Character/ }).allInnerTexts()).map((t) => t.replace(/\n/g, ' ').slice(0, 70)).join(' | '));
  const awards = await imgInfo(aman, 'body').catch(() => null);
  await admin.getByRole('button', { name: '+4h' }).click(); await sleep(400);
  await box(riya).fill('back from the shadow realm'); await riya.getByRole('button', { name: 'Send' }).click();
  await aman.getByRole('button', { name: /season recap/ }).click();
  await aman.getByText(/Ep 1: The One Where/).first().waitFor({ timeout: 8000 });
  console.log('recap:', (await aman.getByText(/Ep 1: The One Where/).first().innerText()));
  void awards;

  // ---- 5. rival commentators
  await admin.getByRole('combobox').filter({ hasText: 'none' }).selectOption('boomer');
  await aman.getByText(/rival: .*Confused Boomer argues back/i).waitFor({ timeout: 4000 });
  await sleep(4500); // let the AI cooldown pass: it stays quiet on purpose
  await box(aman).fill("wait I'll reply later"); await box(aman).press('Enter');
  await aman.getByRole('log').getByText('Confused Boomer').first().waitFor({ timeout: 8000 });
  const labels = await aman.getByRole('log').locator('[data-ai-label]', { hasText: /Gen Z Gremlin|Confused Boomer/ }).allInnerTexts();
  console.log('commentator labels:', [...new Set(labels.map((l) => l.split('\n')[0].trim()))].join(' + '));
  assert.ok(labels.some((l) => /Gen Z Gremlin/i.test(l)) && labels.some((l) => /Confused Boomer/i.test(l)));

  // ---- 6. lore (forced: the organic callback is random)
  await admin.getByRole('button', { name: 'lore', exact: true }).click();
  await aman.locator('[data-ai-label]', { hasText: /· lore/i }).first().waitFor({ timeout: 8000 });
  console.log('lore callback:', (await aman.locator('[data-ai-label]', { hasText: /· lore/i }).last().locator('xpath=following-sibling::p').innerText()).slice(0, 90));

  await aman.screenshot({ path: `${SHOTS}/c1-desktop.png` });
  await riya.getByRole('button', { name: 'Chat', exact: true }).click(); await sleep(300);
  await riya.screenshot({ path: `${SHOTS}/c2-mobile.png` });
  const ov = await riya.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log('mobile horizontal overflow px:', ov); assert.equal(ov, 0);
  console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('UI-C FAILED:', e.message.split('\n').slice(0, 8).join('\n')); console.error(errors.join('\n')); process.exit(1); });
