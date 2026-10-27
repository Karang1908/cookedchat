const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const SHOTS = process.env.SHOTS ?? require('node:path').join(__dirname, 'shots');
require('node:fs').mkdirSync(SHOTS, { recursive: true });
const WEB = process.env.WEB ?? 'http://localhost:3010';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const watch = (p, n) => { p.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|giphy/i.test(m.text()) && errors.push(`[${n}] ${m.text()}`)); p.on('pageerror', (e) => errors.push(`[${n}] pageerror ${e.message}`)); };
const box = (p) => p.getByRole('textbox', { name: 'Message' });

(async () => {
  const browser = await chromium.launch();
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const aman = await dctx.newPage(); watch(aman, 'aman');
  await aman.goto(WEB);
  await aman.getByRole('button', { name: /start a room/i }).click();
  await aman.waitForURL(/\/r\/[A-Z]{4}$/);
  const code = aman.url().split('/').pop();
  await aman.getByLabel('your name').fill('Aman');
  await aman.getByRole('button', { name: /tap to enter/i }).click();
  await aman.getByRole('log').waitFor();

  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const riya = await mctx.newPage(); watch(riya, 'riya');
  await riya.goto(`${WEB}/r/${code}`);
  await riya.getByLabel('your name').fill('Riya');
  await riya.getByRole('button', { name: /tap to enter/i }).click();
  await riya.getByRole('log').waitFor();

  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addInitScript(() => sessionStorage.setItem('cooked.adminKey', 'letmein'));
  const admin = await actx.newPage(); watch(admin, 'admin');
  await admin.goto(`${WEB}/admin/${code}`);
  await admin.getByRole('button', { name: /add Aman, Riya/i }).click();
  await sleep(500);

  // 1. Ohio chip + AI line
  await box(aman).fill('SKIBIDI OHIO SIGMA RIZZ FANUM TAX!!!! 💀💀💀💀');
  await box(aman).press('Enter');
  await riya.getByText(/ohio \d+%/).first().waitFor({ timeout: 6000 });
  await aman.getByText(/Ohio level \d+%|Ohio-certified|% Ohio/).first().waitFor({ timeout: 6000 });
  console.log('ohio chip + instant AI line ok');

  // 2. reply + reaction from Riya (mobile: buttons are shown on coarse pointers)
  const target = riya.locator('[data-mid]').first();
  await target.getByRole('button', { name: 'Reply' }).click();
  await riya.getByText(/Replying to/).waitFor();
  await box(riya).fill('bro that is a crime');
  await riya.getByRole('button', { name: 'Send' }).click();
  await aman.getByText('bro that is a crime').first().waitFor();
  await aman.getByText(/^Aman$/).first().waitFor({ state: 'attached' }).catch(() => {});
  await aman.locator('text=/SKIBIDI/').first().waitFor();
  const quoteVisible = await aman.locator('div.border-l-2', { hasText: 'SKIBIDI' }).count();
  console.log('reply quote rendered on the other client:', quoteVisible > 0);
  assert.ok(quoteVisible > 0);
  const row = aman.locator('div.group', { hasText: 'bro that is a crime' }).first();
  await row.hover();
  await row.getByRole('button', { name: 'React' }).click();
  await aman.getByRole('menuitem', { name: '💀' }).click();
  await riya.locator('button[aria-pressed]', { hasText: '💀' }).first().waitFor({ timeout: 4000 });
  console.log('member reaction synced');

  // 3. profile dialog
  await aman.getByRole('button', { name: 'Riya profile' }).first().click();
  await aman.getByRole('dialog').getByText(/scouter reading/).waitFor();
  const dialogText = await aman.getByRole('dialog').innerText();
  console.log('profile has creature + class + tier:', /Lirili|Tung|Bombardiro|Ballerina|Patapim|Trippi|Cappuccino/i.test(dialogText), /Lurker|Instigator|Healer|Final Boss/i.test(dialogText), /tier/i.test(dialogText));
  await aman.screenshot({ path: `${SHOTS}/a1-profile.png` });
  await aman.keyboard.press('Escape');

  // 4. rizz tab
  await aman.getByRole('tab', { name: 'rizz' }).click();
  await aman.getByText('Rizz meter').waitFor();

  // 5. vibe switcher from a member
  await aman.locator('select').first().selectOption('nature');
  await sleep(400);
  assert.match(await riya.locator('body').innerText().then(async () => { await riya.getByRole('button', { name: 'Room' }).click(); return riya.locator('select').first().inputValue(); }), /nature/);
  await riya.screenshot({ path: `${SHOTS}/a2-mobile-room-vibe.png` });
  await riya.getByRole('button', { name: 'Chat' }).click();
  console.log('vibe switcher synced across clients');

  // 6. admin: simp radar, derail, poster, midnight
  await admin.getByRole('button', { name: /simp radar/ }).click();
  await aman.getByText(/simp radar|everyone else in/i).first().waitFor({ timeout: 10000 });
  console.log('simp radar shown');
  await admin.getByRole('button', { name: /topic derail/ }).click();
  await sleep(3000);
  await admin.getByRole('button', { name: '+12h' }).click();
  await aman.getByText(/^MISSING$/i).first().waitFor({ timeout: 8000 });
  console.log('missing poster card rendered');
  await aman.screenshot({ path: `${SHOTS}/a3-desktop-poster.png` });
  // midnight: warp so local hour lands at 2am
  const hour = await aman.evaluate(() => new Date().getUTCHours());
  const off = await admin.locator('text=/from real/').innerText();
  console.log('clock label:', off.trim());
  await admin.getByRole('button', { name: 'reset' }).click();
  await sleep(500);
  const toTwo = (((2 - hour + 24) % 24) + 0.5) * 3600_000;
  await admin.evaluate(() => {}); // keep page alive
  await admin.getByRole('button', { name: '+30m' }).click(); await sleep(200); await admin.getByRole('button', { name: 'reset' }).click();
  for (let i = 0; i < Math.round(toTwo / 3600_000 / 4); i++) await admin.getByRole('button', { name: '+4h' }).click();
  await sleep(1500);
  const midnightVisible = await aman.getByText(/midnight/).first().isVisible().catch(() => false);
  console.log('midnight badge visible (clock moved):', midnightVisible);
  await riya.screenshot({ path: `${SHOTS}/a4-mobile-chat.png` });

  console.log('console/page errors:', errors.length ? '\n' + errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('UI-A FAILED:', e.message.split('\n').slice(0, 6).join('\n')); console.error(errors.join('\n')); process.exit(1); });
