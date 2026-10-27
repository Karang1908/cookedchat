import { createRequire } from 'node:module';
const { io } = createRequire(import.meta.url)('../apps/server/node_modules/socket.io-client');
import assert from 'node:assert/strict';

const URL = process.env.SERVER ?? 'http://127.0.0.1:4010';
const log = (...a) => console.log(...a);
const connect = () => new Promise((res) => { const s = io(URL, { transports: ['websocket'] }); s.on('connect', () => res(s)); });
const emit = (s, ev, p) => new Promise((res) => s.emit(ev, p, res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function collect(s) {
  const got = [];
  for (const ev of ['chat:message', 'chat:update', 'aura:change', 'cooked:update', 'fx', 'sound', 'typing:update', 'ai:thinking', 'room:members', 'room:settings']) s.on(ev, (...a) => got.push({ ev, a }));
  return { got, of: (ev) => got.filter((g) => g.ev === ev).map((g) => g.a), clear: () => (got.length = 0) };
}

const mode = process.argv[2];
if (mode === 'phase1') {
  const A = await connect(), B = await connect(), X = await connect(), ADM = await connect();
  const a = collect(A), b = collect(B);

  const created = await emit(A, 'room:create', { tzOffsetMin: 330 });
  log('create ack', created);
  assert.equal(created.ok, true); assert.match(created.code, /^[A-Z]{4}$/);
  const code = created.code;
  console.log('ROOM=' + code);

  assert.deepEqual(await emit(A, 'room:join', { code: 'n0pe', memberId: 'm-a', name: 'Aman', avatar: 'cat' }), { ok: false, error: 'bad room code' });
  assert.equal((await emit(A, 'room:join', { code: 'ZZZZ', memberId: 'm-a', name: 'Aman', avatar: 'cat' })).error, 'room not found');
  const ja = await emit(A, 'room:join', { code: code.toLowerCase(), memberId: 'm-a', name: 'Aman', avatar: 'cat' });
  const jb = await emit(B, 'room:join', { code, memberId: 'm-b', name: 'Riya', avatar: 'ghost' });
  assert.equal(ja.ok, true); assert.equal(jb.snapshot.members.length, 2);
  log('join ok; members =', jb.snapshot.members.map((m) => m.name));

  // not joined -> rejected, and non-admin cannot use admin events
  assert.deepEqual(await emit(X, 'chat:send', { text: 'hi' }), { ok: false, error: 'join a room first' });
  X.emit('admin:warp', { ms: 99999999 });
  assert.equal((await emit(ADM, 'admin:auth', { key: 'wrong', code })).error, 'wrong key');
  const adm = await emit(ADM, 'admin:auth', { key: 'letmein', code });
  assert.equal(adm.ok, true); assert.equal(adm.snapshot.clockOffsetMs, 0, 'non-admin warp ignored');
  const admEv = collect(ADM);

  // 67
  a.clear(); b.clear();
  const sent = await emit(A, 'chat:send', { text: '67' });
  assert.equal(sent.ok, true);
  await sleep(300);
  log('B saw:', b.got.map((g) => g.ev).join(', '));
  assert.ok(b.of('chat:message').some(([m]) => m.text === '67'));
  assert.deepEqual(b.of('aura:change')[0].slice(1), [67]);
  assert.deepEqual(b.of('fx').map(([f]) => f.kind), ['shake', 'emojiRain']);
  assert.deepEqual(b.of('sound')[0], [{ name: 'vineBoom' }]);
  assert.ok(b.of('chat:message').some(([m]) => m.kind === 'ai'));
  assert.ok(b.of('cooked:update').length > 0);

  // a priority-8 trigger always goes through the (mock) LLM
  await sleep(6100); // clear the 6s comment cooldown
  b.clear();
  await emit(B, 'chat:send', { text: "wait I'll reply later" });
  await sleep(500);
  const ai = b.of('chat:message').map(([m]) => m).find((m) => m.kind === 'ai');
  log('dry reply AI line:', ai?.text);
  assert.match(ai.text, /^MOCK-LLM: said they would reply later/);
  assert.deepEqual(b.of('aura:change').map(([e]) => e.delta), [-500]);
  assert.deepEqual(b.of('ai:thinking').map(([o]) => o), [true, false]);

  // typing indicator reaches the other client
  b.clear();
  A.emit('typing', { state: 'start', len: 1 });
  await sleep(150);
  assert.deepEqual(b.of('typing:update').at(-1)[0], ['m-a']);
  A.emit('typing', { state: 'stop', len: 0 });
  await sleep(150);
  assert.deepEqual(b.of('typing:update').at(-1)[0], []);

  // admin: bots + stage a slow reply, change settings + timings
  admEv.clear();
  ADM.emit('admin:addBots');
  await sleep(150);
  ADM.emit('admin:settings', { persona: 'nature', brainrot: 3, timings: { deadChatMs: 60000 } });
  await sleep(150);
  assert.equal(admEv.of('room:settings').at(-1)[0].persona, 'nature');
  assert.equal(admEv.of('room:settings').at(-1)[0].timings.deadChatMs, 60000);
  ADM.emit('admin:simulate', { kind: 'slow_reply', memberId: 'bot-riya' });
  await sleep(1200);
  const auras = admEv.of('aura:change').map(([e, t]) => `${e.reason}:${e.delta}`);
  log('admin saw aura changes:', auras);
  assert.ok(auras.includes('slow_reply:-400'));
  assert.ok(admEv.of('room:settings').at(-1)[1] > 3 * 3600_000, 'clock offset advanced by the warp');

  // rate limit via the real socket path
  const results = [];
  for (let i = 0; i < 8; i++) results.push((await emit(A, 'chat:send', { text: 'spam ' + i })).ok);
  log('rate limit results', results);
  assert.ok(results.includes(false));

  // edit then delete (client-visible)
  await sleep(5200);
  b.clear();
  const m = await emit(A, 'chat:send', { text: 'my secret plan' });
  A.emit('chat:edit', { id: m.id, text: 'public plan' });
  await sleep(150);
  A.emit('chat:delete', { id: m.id });
  await sleep(600);
  const upd = b.of('chat:update').map(([x]) => x);
  assert.ok(upd.every((u) => !JSON.stringify(u).includes('secret')));
  assert.ok(upd.some((u) => u.deleted && u.text === ''));
  log('PHASE1 OK');
  A.close(); B.close(); X.close(); ADM.close();
  process.exit(0);
}

if (mode === 'phase2') {
  const code = process.argv[3];
  const A = await connect();
  const j = await emit(A, 'room:join', { code, memberId: 'm-a', name: 'Aman', avatar: 'cat' });
  assert.equal(j.ok, true, JSON.stringify(j));
  const s = j.snapshot;
  log('after restart: members', s.members.map((m) => `${m.name}:${m.aura}`), 'messages', s.messages.length, 'ledger', s.ledger.length, 'offset>0', s.clockOffsetMs > 0, 'persona', s.settings.persona);
  assert.equal(s.members.find((m) => m.id === 'm-a').aura, 67 + (s.ledger.filter((l) => l.memberId === 'm-a' && l.reason !== 'six_seven').reduce((t, l) => t + l.delta, 0)));
  assert.ok(s.messages.some((m) => m.text === '67'));
  assert.equal(s.members.find((m) => m.id === 'bot-riya').aura, -400);
  assert.equal(s.settings.persona, 'nature');
  assert.ok(s.clockOffsetMs > 3 * 3600_000);
  assert.ok(!s.messages.some((m) => JSON.stringify(m).includes('secret')));
  const edits = 'checked-in-db';
  log('PHASE2 OK', edits);
  process.exit(0);
}
