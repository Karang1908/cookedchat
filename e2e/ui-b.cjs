const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const SHOTS = process.env.SHOTS ?? require('node:path').join(__dirname, 'shots');
require('node:fs').mkdirSync(SHOTS, { recursive: true });
const WEB = process.env.WEB ?? 'http://localhost:3010';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (p, n) => { p.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|giphy/i.test(m.text()) && errors.push(`[${n}] ${m.text()}`)); p.on('pageerror', (e) => errors.push(`[${n}] pageerror ${e.message}`)); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

(async () => {
  const browser = await chromium.launch();
  const aman = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(aman, 'aman');
  await aman.goto(WEB); await aman.getByRole('button', { name: /start a room/i }).click(); await aman.waitForURL(/\/r\/[A-Z]{4}$/);
  const code = aman.url().split('/').pop();
  await aman.getByLabel('your name').fill('Aman'); await aman.getByRole('button', { name: /tap to enter/i }).click(); await aman.getByRole('log').waitFor();
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const riya = await mctx.newPage(); watch(riya, 'riya');
  await riya.goto(`${WEB}/r/${code}`); await riya.getByLabel('your name').fill('Riya'); await riya.getByRole('button', { name: /tap to enter/i }).click(); await riya.getByRole('log').waitFor();
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addInitScript(() => sessionStorage.setItem('cooked.adminKey', 'letmein'));
  const admin = await actx.newPage(); watch(admin, 'admin');
  await admin.goto(`${WEB}/admin/${code}`);
  // these flows test individual roasts, so switch the AI's speaking budget off (what you would do on stage)
  await admin.getByLabel('AI speaks every N human messages').focus(); await admin.keyboard.press('Home'); await sleep(250);
  await admin.getByRole('button', { name: /add Aman, Riya/i }).click(); await sleep(400);
  await admin.getByRole('button', { name: 'demo speed' }).click(); await sleep(400);
  const stage = (re) => admin.getByRole('button', { name: re }).click();

  // ---- 1. "Chat, is this real?" (staged claim by a bot; bots vote; both humans vote)
  await stage(/big claim/);
  await aman.getByText('Chat, is this real?').first().waitFor({ timeout: 8000 });
  await riya.getByText('Chat, is this real?').first().waitFor();
  await riya.getByRole('button', { name: 'Vote Cap' }).first().click();
  await aman.getByRole('button', { name: 'Vote Real' }).first().click();
  await aman.getByText(/Verdict: .*CAP|Verdict: .*REAL|Hung jury/).first().waitFor({ timeout: 8000 });
  console.log('vote settled with a verdict:', (await aman.getByText(/Verdict:|Hung jury/).first().innerText()).slice(0, 90));
  assert.equal(await aman.getByRole('button', { name: 'Vote Cap' }).first().isDisabled(), true, 'closed vote buttons disabled');
  await sleep(500);
  await riya.screenshot({ path: `${SHOTS}/b1-mobile-vote.png` });

  // ---- 2. hot take by a human, validation + rate limit
  await aman.getByRole('radio', { name: 'Games', exact: true }).click(); // desktop: games live behind the Games tab
  await aman.getByLabel('hot take arena').fill('no');
  assert.equal(await aman.getByRole('button', { name: 'post' }).isDisabled(), true, 'too short is blocked client-side');
  await aman.getByLabel('hot take arena').fill('cereal is soup obviously');
  await aman.getByRole('button', { name: 'post' }).click();
  await riya.getByText('Hot take arena').first().waitFor({ timeout: 5000 });
  await aman.getByLabel('hot take arena').fill('a second take right away');
  await aman.getByRole('button', { name: 'post' }).click();
  await aman.getByRole('status').filter({ hasText: /one hot take per 20 seconds/ }).waitFor({ timeout: 4000 });
  console.log('hot take posted; second one rate limited with the reason shown');
  await riya.getByRole('button', { name: 'Vote Trash' }).first().click().catch(() => console.log('(riya may be the subject? no, aman posted)'));
  await sleep(300);

  // ---- 3. prediction market
  await aman.getByLabel('Market subject').selectOption({ label: 'will Riya reply…' });
  await aman.getByLabel('Market window').selectOption('1');
  await aman.getByRole('button', { name: '💰 open' }).click();
  await aman.getByText('Will Riya reply in under 1 min?').first().waitFor({ timeout: 5000 });
  await riya.getByText('Will Riya reply in under 1 min?').first().waitFor();
  assert.equal(await riya.getByRole('button', { name: /Bet \d+ on yes/ }).count(), 0, 'the subject cannot bet on themselves');
  await aman.getByRole('button', { name: 'Bet 50 on yes' }).first().click();
  await aman.getByText(/you bet 50 🪙 on YES/).first().waitFor({ timeout: 4000 });
  assert.match(await aman.locator('section[aria-label="Games"]').innerText(), /950 🪙/);
  await stage(/prediction market/); await sleep(800);   // bots open their own market + bet
  await admin.getByRole('button', { name: '+30m' }).click();
  await aman.getByText(/Market closed: Riya did not reply in time/).first().waitFor({ timeout: 8000 });
  console.log('market settled:', (await aman.getByText(/Market closed:/).first().innerText()).slice(0, 100));
  assert.match(await aman.locator('section[aria-label="Games"]').innerText(), /1[0-9]{3} 🪙|950 🪙/);

  // ---- 4. rizz battle between the two humans
  await aman.getByLabel('Battle opponent').selectOption({ label: 'Riya' });
  await aman.getByRole('button', { name: '⚔️ fight' }).click();
  await riya.getByText('Rizz battle ⚔️').first().waitFor({ timeout: 5000 });
  await aman.getByLabel('Your rizz line').fill('you are genuinely funny and i am lucky to know you 😊');
  await aman.getByRole('button', { name: 'send', exact: true }).first().click();
  await riya.getByLabel('Your rizz line').fill('k. ok.');
  await riya.getByRole('button', { name: 'send', exact: true }).first().click();
  await aman.getByText(/wins the rizz battle/).first().waitFor({ timeout: 8000 });
  console.log('battle verdict:', (await aman.getByText(/wins the rizz battle/).first().innerText()).slice(0, 90));
  await sleep(400);
  await riya.getByRole('button', { name: 'Chat', exact: true }).click();

  // ---- 5. anonymous confession
  await riya.getByRole('button', { name: 'Games', exact: true }).click();
  await riya.getByLabel('anonymous confession').fill('i have been pretending to read this chat for weeks');
  await riya.getByRole('button', { name: '🤫' }).click();
  await riya.getByRole('button', { name: 'Chat', exact: true }).click();
  await aman.getByText('Anonymous confession').first().waitFor({ timeout: 5000 });
  const conf = await aman.locator('div', { hasText: /AI guesses/ }).last().innerText();
  console.log('confession card:', conf.replace(/\n/g, ' | ').slice(0, 140));
  assert.ok(!/Riya (posted|wrote|confessed)/i.test(conf));

  // ---- 6. forecast, replay, chaos, copypasta
  await aman.getByRole('button', { name: '🌦️ chat forecast' }).click();
  await aman.getByText('Chat weather forecast').first().waitFor({ timeout: 5000 });
  await admin.getByRole('button', { name: '+30m' }).click(); await sleep(500);
  await aman.getByRole('button', { name: '🎬 instant replay' }).click();
  await aman.getByText(/Let's go to the tape/).first().waitFor({ timeout: 5000 });
  await admin.getByRole('button', { name: 'chaos', exact: true }).click();
  await aman.getByText(/Chaos agent: (dare|plot twist)/).first().waitFor({ timeout: 5000 });
  await admin.getByRole('button', { name: 'copypasta', exact: true }).click();
  await aman.getByText('Cursed copypasta').first().waitFor({ timeout: 5000 });
  console.log('forecast, replay, chaos, copypasta cards ok');
  await aman.screenshot({ path: `${SHOTS}/b2-desktop-games.png` });
  await riya.getByRole('button', { name: 'Chat', exact: true }).click(); await sleep(300);
  await riya.screenshot({ path: `${SHOTS}/b3-mobile-cards.png` });
  console.log('mobile horizontal overflow px:', await overflow(riya));
  assert.equal(await overflow(riya), 0);
  console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('UI-B FAILED:', e.message.split('\n').slice(0, 7).join('\n')); console.error(errors.join('\n')); process.exit(1); });
