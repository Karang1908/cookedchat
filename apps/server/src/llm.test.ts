import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { DEFAULT_SETTINGS } from '@cooked/shared';
import { ollamaProvider, openAiCompatProvider } from './llm/providers.js';
import { LlmRouter } from './llm/router.js';
import { buildMessages, sanitizeLine } from './llm/prompt.js';
import { loadConfig, placeholderKeys } from './config.js';

type Handler = (req: http.IncomingMessage, body: any, res: http.ServerResponse) => void;
let server: http.Server;
let base = '';
const handlers = new Map<string, Handler>();
const hits: Record<string, number> = {};
const lastBody: Record<string, any> = {};

before(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      hits[req.url!] = (hits[req.url!] ?? 0) + 1;
      const body = raw ? JSON.parse(raw) : {};
      lastBody[req.url!] = { body, auth: req.headers.authorization };
      const h = handlers.get(req.url!);
      if (!h) return void res.writeHead(404).end();
      h(req, body, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const ok = (content: string): Handler => (_q, _b, res) => {
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ choices: [{ message: { content } }] }));
};
const opts = { attemptTimeoutMs: 300, deadlineMs: 1000, defaultCooldownMs: 5000 };
const msgs = [{ role: 'user' as const, content: 'hi' }];
const groq = (name: string, path: string) => openAiCompatProvider({ name, baseUrl: `${base}${path}`, apiKey: 'k-test', model: 'm', reasoningEffort: 'low' });

test('openai-compatible provider: sends bearer auth, model, reasoning_effort; parses content', async () => {
  handlers.set('/g1/chat/completions', ok('hello there'));
  const r = new LlmRouter([groq('g1', '/g1')], opts);
  assert.deepEqual(await r.complete(msgs), { text: 'hello there', provider: 'g1' });
  const { body, auth } = lastBody['/g1/chat/completions'];
  assert.equal(auth, 'Bearer k-test');
  assert.equal(body.model, 'm');
  assert.equal(body.reasoning_effort, 'low');
  assert.ok(body.max_completion_tokens >= 200);
});

test('ollama provider: native /api/chat shape, stream false', async () => {
  handlers.set('/api/chat', (_q, _b, res) => res.writeHead(200).end(JSON.stringify({ message: { role: 'assistant', content: 'from ollama' } })));
  const r = new LlmRouter([ollamaProvider({ name: 'ollama', baseUrl: base, apiKey: 'o-key', model: 'gpt-oss:120b' })], opts);
  assert.deepEqual(await r.complete(msgs), { text: 'from ollama', provider: 'ollama' });
  assert.equal(lastBody['/api/chat'].body.stream, false);
  assert.equal(lastBody['/api/chat'].body.model, 'gpt-oss:120b');
  assert.equal(lastBody['/api/chat'].auth, 'Bearer o-key');
});

test('429 falls through to the next provider, and Retry-After puts the first on cooldown', async () => {
  handlers.set('/a/chat/completions', (_q, _b, res) => res.writeHead(429, { 'retry-after': '30' }).end('{}'));
  handlers.set('/b/chat/completions', ok('second wins'));
  let t = 1_000_000;
  const r = new LlmRouter([groq('a', '/a'), groq('b', '/b')], opts, () => t);
  assert.equal((await r.complete(msgs))?.provider, 'b');
  const aBefore = hits['/a/chat/completions'];
  assert.equal((await r.complete(msgs))?.provider, 'b');
  assert.equal(hits['/a/chat/completions'], aBefore, 'a is skipped while cooling down');
  t += 31_000;
  await r.complete(msgs);
  assert.equal(hits['/a/chat/completions'], aBefore + 1, 'a is retried after Retry-After');
});

test('empty completion counts as failure and falls through', async () => {
  handlers.set('/e/chat/completions', ok('   '));
  handlers.set('/f/chat/completions', ok('fine'));
  const r = new LlmRouter([groq('e', '/e'), groq('f', '/f')], opts);
  assert.equal((await r.complete(msgs))?.provider, 'f');
});

test('slow provider times out and the next answers within the deadline', async () => {
  handlers.set('/slow/chat/completions', (_q, _b, res) => setTimeout(() => res.writeHead(200).end(JSON.stringify({ choices: [{ message: { content: 'late' } }] })), 800));
  handlers.set('/fast/chat/completions', ok('quick'));
  const r = new LlmRouter([groq('slow', '/slow'), groq('fast', '/fast')], opts);
  const t0 = Date.now();
  assert.equal((await r.complete(msgs))?.provider, 'fast');
  assert.ok(Date.now() - t0 < 700);
});

test('everything failing returns null within the deadline (caller uses a canned line)', async () => {
  handlers.set('/x/chat/completions', (_q, _b, res) => res.writeHead(500).end());
  handlers.set('/y/chat/completions', (_q, _b, res) => setTimeout(() => res.end('{}'), 5000));
  const r = new LlmRouter([groq('x', '/x'), groq('y', '/y'), groq('missing', '/nope')], opts);
  const t0 = Date.now();
  assert.equal(await r.complete(msgs), null);
  assert.ok(Date.now() - t0 < 1500);
});

test('bad key (401) sidelines the provider for a long time', async () => {
  handlers.set('/k/chat/completions', (_q, _b, res) => res.writeHead(401).end());
  handlers.set('/l/chat/completions', ok('ok'));
  let t = 5_000_000;
  const r = new LlmRouter([groq('k', '/k'), groq('l', '/l')], opts, () => t);
  await r.complete(msgs);
  const n = hits['/k/chat/completions'];
  t += 60_000;
  await r.complete(msgs);
  assert.equal(hits['/k/chat/completions'], n);
});

test('unreachable host is just another failure', async () => {
  const r = new LlmRouter([openAiCompatProvider({ name: 'dead', baseUrl: 'http://127.0.0.1:1', apiKey: 'k', model: 'm' })], opts);
  assert.equal(await r.complete(msgs), null);
});

test('sanitizeLine: first line, strips quotes and speaker labels, truncates, blocks off-limits', () => {
  assert.equal(sanitizeLine('"bro really sent k 💀"\nextra explanation'), 'bro really sent k 💀');
  assert.equal(sanitizeLine('AI: nice one'), 'nice one');
  assert.equal(sanitizeLine('   '), null);
  assert.equal(sanitizeLine('x'.repeat(400))!.length, 160);
  assert.equal(sanitizeLine('you are so ugly lol'), null);
  assert.equal(sanitizeLine('your mom would be disappointed'), null);
});

test('buildMessages: carries persona, level, intensity, guardrail and the facts', () => {
  const m = buildMessages({
    kind: 'dry_reply', name: 'Aman', text: 'k', fact: 'sent a dry reply: "k"', recent: [{ name: 'Riya', text: 'did you see it' }],
    settings: { ...DEFAULT_SETTINGS, persona: 'nature', brainrot: 3, intensity: 3 }, midnight: true,
  });
  assert.equal(m[0]!.role, 'system');
  assert.match(m[0]!.content, /nature documentary/);
  assert.match(m[0]!.content, /Ohio Final Boss|word salad/);
  assert.match(m[0]!.content, /never the person's identity/);
  assert.match(m[0]!.content, /middle of the night/);
  assert.match(m[1]!.content, /Aman/);
  assert.match(m[1]!.content, /Riya: did you see it/);
});

test('config: .env.example placeholders count as unset, real values pass through', () => {
  const pasted = {
    ADMIN_KEY: 'REPLACE_ME_with_a_long_random_password',
    CORS_ORIGINS: 'https://your-web.onrender.com',
    DATABASE_URL: 'postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:REPLACE_ME@aws-0-region.pooler.supabase.com:5432/postgres',
    GROQ_API_KEY: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    OLLAMA_API_KEY: 'REPLACE_ME_ollama_cloud_key',
    GIPHY_API_KEY: 'REPLACE_ME_giphy_key',
  };
  const c = loadConfig(pasted);
  assert.deepEqual([c.adminKey, c.databaseUrl, c.groqKey, c.ollamaKey, c.giphyKey], [null, null, null, null, null]);
  assert.equal(c.corsOrigins, true);
  assert.deepEqual(placeholderKeys(pasted), Object.keys(pasted));

  const filled = loadConfig({ ADMIN_KEY: 'k9#Lm2', GROQ_API_KEY: 'gsk_4bQ7', CORS_ORIGINS: 'https://cookedchat-web.onrender.com' });
  assert.equal(filled.adminKey, 'k9#Lm2');
  assert.equal(filled.groqKey, 'gsk_4bQ7');
  assert.deepEqual(filled.corsOrigins, ['https://cookedchat-web.onrender.com']);
});
