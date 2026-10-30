import { Logger } from '@nestjs/common';
import type { Config } from '../config.js';
import { isOffLimits } from '@cooked/shared';
import type { CommentContext } from './prompt.js';
import { buildMessages, extractGif, sanitizeLine } from './prompt.js';
import { ollamaProvider, openAiCompatProvider } from './providers.js';
import type { LlmProvider } from './providers.js';
import { LlmRouter } from './router.js';
import type { CommentWriter, Line } from '../engine.js';

export function buildRouter(c: Config): LlmRouter {
  const log = new Logger('LlmFactory');
  const all: Record<string, (() => LlmProvider) | null> = {
    'groq-120b': c.groqKey ? () => openAiCompatProvider({ name: 'groq-120b', baseUrl: c.groqBase, apiKey: c.groqKey!, model: 'openai/gpt-oss-120b', reasoningEffort: 'low' }) : null,
    'groq-20b': c.groqKey ? () => openAiCompatProvider({ name: 'groq-20b', baseUrl: c.groqBase, apiKey: c.groqKey!, model: 'openai/gpt-oss-20b', reasoningEffort: 'low' }) : null,
    ollama: c.ollamaKey ? () => ollamaProvider({ name: 'ollama', baseUrl: c.ollamaBase, apiKey: c.ollamaKey!, model: c.ollamaModel }) : null,
  };
  const providers = c.llmOrder.flatMap((n) => {
    const make = all[n];
    return make ? [make()] : [];
  });
  if (!providers.length) log.warn('no LLM provider configured (set GROQ_API_KEY and/or OLLAMA_API_KEY): canned lines only');
  else log.log(`LLM chain: ${providers.map((p) => p.name).join(' -> ')} -> canned`);
  return new LlmRouter(providers, { attemptTimeoutMs: c.attemptTimeoutMs, deadlineMs: c.deadlineMs, defaultCooldownMs: 30_000 });
}

export class LlmCommentator implements CommentWriter {
  constructor(private readonly router: LlmRouter) {}

  async write(ctx: CommentContext): Promise<Line | null> {
    return toLine(await this.router.complete(buildMessages(ctx), ctx.prefer));
  }

  /** one sanitized line from a free-form prompt (AI-vs-AI duel banter) */
  async say(p: { system: string; user: string; prefer?: 'groq' | 'ollama' }): Promise<Line | null> {
    return toLine(await this.router.complete([{ role: 'system', content: p.system }, { role: 'user', content: p.user }], p.prefer));
  }

  /** free-form generation for judges, translators, captions, recaps. Anything touching off-limits topics is dropped. */
  async generate(p: { system: string; user: string }): Promise<string | null> {
    const r = await this.router.complete([{ role: 'system', content: p.system }, { role: 'user', content: p.user }]);
    const text = r?.text.trim();
    return text && !isOffLimits(text) ? text : null;
  }
}

/** model output -> a safe line, plus the GIF search it asked for ("[gif: ...]"), if any */
function toLine(r: { text: string; provider: string } | null): Line | null {
  if (!r) return null;
  const { text: raw, gif } = extractGif(r.text);
  const text = sanitizeLine(raw);
  return text ? { text, model: r.provider, ...(gif ? { gif } : {}) } : null;
}
