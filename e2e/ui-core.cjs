const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const SHOTS = process.env.SHOTS ?? require('node:path').join(__dirname, 'shots');
require('node:fs').mkdirSync(SHOTS, { recursive: true });
const WEB = process.env.WEB ?? 'http://localhost:3010';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (page, name) => {
  page.on('console', (m) => { if (m.type() === 'error') !/ERR_TUNNEL|giphy/i.test(m.text()) && errors.push(`[${name}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
};

(async () => {
  const browser = await chromium.launch();

  // ---- landing (desktop) -> create room
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const landing = await dctx.newPage(); watch(landing, 'landing');
  await landing.goto(WEB);
  await landing.getByRole('button', { name: /start a room/i }).waitFor();
  await sleep(1200);
  await landing.screenshot({ path: `${SHOTS}/01-landing-desktop.png` });
  await landing.getByRole('button', { name: /start a room/i }).click();
  await landing.waitForURL(/\/r\/[A-Z]{4}$/, { timeout: 15000 });
  const code = landing.url().split('/').pop();
  console.log('created room', code);

  // ---- join gate -> Aman enters (desktop)
  await landing.getByLabel('your name').fill('Aman');
  await sleep(500);
  await landing.screenshot({ path: `${SHOTS}/02-join-gate.png` });
  await landing.getByRole('button', { name: /tap to enter/i }).click();
  await landing.getByRole('log').waitFor();

  // ---- Riya on a phone viewport
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const riya = await mctx.newPage(); watch(riya, 'riya');
  await riya.goto(`${WEB}/r/${code}`);
  await riya.getByLabel('your name').fill('Riya');
  await riya.getByRole('button', { name: /tap to enter/i }).click();
  await riya.getByRole('log').waitFor();
  await riya.screenshot({ path: `${SHOTS}/03-mobile-empty.png` });

  // ---- admin
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addInitScript(() => sessionStorage.setItem('cooked.adminKey', 'letmein'));
  const admin = await actx.newPage(); watch(admin, 'admin');
  await admin.goto(`${WEB}/admin/${code}`);
  await admin.getByRole('button', { name: /add Aman, Riya/i }).click();
  await sleep(400);

  // ---- 67 from Aman -> Riya sees it, AI reacts, aura updates
  const aman = landing;
  await aman.getByLabel('Message').fill('67');
  await aman.getByLabel('Message').press('Enter');
  await riya.getByText('67', { exact: true }).first().waitFor({ timeout: 5000 });
  await riya.locator('text=/6 7|SIX SEVEN|67 detected/i').first().waitFor({ timeout: 5000 });
  const shook = await aman.evaluate(() => new Promise((res) => {
    const st = document.getElementById('stage'); if (st.classList.contains('fx-shake')) return res(true);
    const mo = new MutationObserver(() => { if (st.classList.contains('fx-shake')) { mo.disconnect(); res(true); } });
    mo.observe(st, { attributes: true, attributeFilter: ['class'] }); setTimeout(() => res(false), 100);
  }));
  console.log('stage got fx-shake class (may have already finished):', shook);
  await sleep(1800);
  await aman.screenshot({ path: `${SHOTS}/04-after-67-desktop.png` });
  const amanAura = await aman.locator('li:has-text("Aman")').filter({ hasText: '+67' }).count();
  assert.ok(amanAura > 0, 'aura board shows +67 for Aman');

  // ---- fanum tax + reply later from Riya (mobile)
  await sleep(6200);
  await riya.getByLabel('Message').fill("wait I'll reply later");
  await riya.getByRole('button', { name: 'Send' }).click();
  await aman.getByText(/said they would reply later|MOCK-LLM/).first().waitFor({ timeout: 8000 });
  await aman.screenshot({ path: `${SHOTS}/05-ai-llm-line.png` });

  // ---- admin: stage typing drama + warp
  await admin.getByRole('button', { name: /typing drama/ }).first().click();
  await sleep(1500);
  await admin.getByRole('button', { name: '+4h' }).click();
  await sleep(600);
  await admin.screenshot({ path: `${SHOTS}/06-admin.png`, fullPage: true });
  const ledgerBot = await aman.locator('text=/typing spy|Typed an essay/').count();
  console.log('ledger shows typing drama receipt:', ledgerBot > 0);

  // ---- cooked 80 => fried stage 3 on both; then 100 => meltdown overlay
  await admin.getByRole('button', { name: '80%', exact: true }).click();
  await sleep(1800);
  assert.equal(await aman.locator('#stage').getAttribute('data-fry'), '3');
  await aman.screenshot({ path: `${SHOTS}/07-fried-desktop.png` });
  await riya.screenshot({ path: `${SHOTS}/08-fried-mobile.png` });
  await admin.getByRole('button', { name: /100 · meltdown/ }).click();
  await aman.getByText(/IT'S OVER/).first().waitFor({ timeout: 5000 });
  await sleep(1200);
  await aman.screenshot({ path: `${SHOTS}/09-meltdown.png` });
  await riya.screenshot({ path: `${SHOTS}/10-meltdown-mobile.png` });
  await admin.getByRole('button', { name: '0%', exact: true }).click();
  await sleep(2500);
  assert.equal(await aman.locator('#stage').getAttribute('data-fry'), '0', 'UI heals when cooked drops');

  // ---- mobile tabs
  await riya.getByRole('button', { name: 'Aura' }).click();
  await sleep(500);
  await riya.screenshot({ path: `${SHOTS}/11-mobile-aura.png` });
  await riya.getByRole('button', { name: 'Chaos' }).click();
  await sleep(500);
  await riya.screenshot({ path: `${SHOTS}/12-mobile-chaos.png` });
  await riya.getByRole('button', { name: 'Room' }).click();
  await sleep(500);
  await riya.screenshot({ path: `${SHOTS}/13-mobile-room.png` });
  await riya.getByRole('button', { name: 'Chat' }).click();

  // ---- horizontal overflow on phone?
  const overflow = await riya.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('mobile horizontal overflow px:', overflow);

  // ---- bad room
  const bad = await dctx.newPage(); watch(bad, 'bad');
  await bad.goto(`${WEB}/r/ZZZZ`);
  await bad.getByLabel('your name').fill('X');
  await bad.getByRole('button', { name: /tap to enter/i }).click();
  await bad.getByText(/doesn't exist/).waitFor({ timeout: 8000 });

  console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('UI TEST FAILED:', e.message); console.error(errors.join('\n')); process.exit(1); });
