import { createRequire } from 'node:module';
const { io } = createRequire(import.meta.url)('../apps/server/node_modules/socket.io-client');
import assert from 'node:assert/strict';
const URL = process.env.SERVER ?? 'http://127.0.0.1:4010';
const connect = () => new Promise((res) => { const s = io(URL, { transports: ['websocket'] }); s.on('connect', () => res(s)); });
const emit = (s, ev, p) => new Promise((res) => s.emit(ev, p, res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mode = process.argv[2];

if (mode === 'phase1') {
  const A = await connect(), B = await connect(), ADM = await connect();
  const { code } = await emit(A, 'room:create', { tzOffsetMin: 0 });
  console.log('ROOM=' + code);
  const ja = await emit(A, 'room:join', { code, memberId: 'm-a', name: 'Aman', avatar: 'cat' });
  const jb = await emit(B, 'room:join', { code, memberId: 'm-b', name: 'Riya', avatar: 'ghost' });
  assert.ok(ja.snapshot.members[0].stats.creature, 'members carry stats');
  assert.equal(ja.snapshot.members[0].coins, 1000);
  const members = []; B.on('room:members', (m) => members.push(m));
  const msgs = []; B.on('chat:message', (m) => msgs.push(m)); B.on('chat:update', (m) => msgs.push(m));
  assert.equal((await emit(ADM, 'admin:auth', { key: 'letmein', code })).ok, true);
  ADM.emit('admin:settings', { aiEvery: 0 });

  const first = await emit(A, 'chat:send', { text: 'my aura is unmatched' });
  const reply = await emit(B, 'chat:send', { text: 'your aura is a rumor', replyToId: first.id });
  await sleep(300);
  const replyMsg = msgs.find((m) => m.id === reply.id);
  assert.equal(replyMsg.replyToId, first.id);
  assert.equal(typeof replyMsg.ohio, 'number');
  A.emit('chat:react', { id: reply.id, emoji: '💀' });
  await sleep(200);
  const withReaction = msgs.filter((m) => m.id === reply.id).at(-1);
  assert.deepEqual(withReaction.reactions, { '💀': ['m-a'] });
  console.log('reply + reaction ok');

  // vibe from a member
  B.on('room:settings', () => {});
  A.emit('room:vibe', { persona: 'sports', brainrot: 3 });
  await sleep(200);
  ADM.emit('admin:addBots'); await sleep(200);
  ADM.emit('admin:aura', { memberId: 'm-b', delta: 10000 });
  await sleep(1800);
  const last = members.at(-1);
  const riya = last.find((m) => m.id === 'm-b');
  console.log('riya stats:', riya.stats.creature, riya.stats.tier, 'power', riya.stats.power, 'aura', riya.aura);
  assert.ok(riya.stats.power >= 9000);

  // poster after +7h
  ADM.emit('admin:warp', { ms: 7 * 3600_000 }); await sleep(2500);
  const posters = msgs.filter((m) => m.card?.type === 'poster');
  console.log('posters:', posters.map((p) => p.card.name));
  assert.ok(posters.length >= 1);
  ADM.emit('admin:elsewhere', { memberId: 'm-a', on: true }); await sleep(200);
  await sleep(6500); // let extras flush (5s)
  console.log('PHASE1 OK');
  process.exit(0);
}
if (mode === 'phase2') {
  const code = process.argv[3];
  const A = await connect();
  const j = await emit(A, 'room:join', { code, memberId: 'm-a', name: 'Aman', avatar: 'cat' });
  assert.equal(j.ok, true, JSON.stringify(j));
  const s = j.snapshot;
  const riya = s.members.find((m) => m.id === 'm-b');
  console.log('after restart: riya power', riya.stats.power, 'coins', riya.coins, 'messages', s.messages.length, 'persona', s.settings.persona, 'brainrot', s.settings.brainrot);
  assert.ok(riya.stats.power >= 9000, 'stats survived the restart');
  assert.equal(s.settings.persona, 'sports');
  const rep = s.messages.find((m) => m.text === 'your aura is a rumor');
  assert.ok(rep.replyToId && rep.reactions['💀'], 'reply + reactions survived');
  assert.ok(s.messages.some((m) => m.card?.type === 'poster'), 'poster card survived');
  assert.equal(typeof rep.ohio, 'number');
  console.log('PHASE2 OK');
  process.exit(0);
}
