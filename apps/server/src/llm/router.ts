import { Logger } from '@nestjs/common';
import type { ChatMsg, LlmProvider } from './providers.js';
import { ProviderError } from './providers.js';

export interface RouterOptions {
  /** hard ceiling for one attempt */
  attemptTimeoutMs: number;
  /** ceiling across the whole chain: comedy has a latency budget */
  deadlineMs: number;
  /** cool-down after a 429 with no Retry-After, or other hard failure */
  defaultCooldownMs: number;
}

export class LlmRouter {
  private readonly log = new Logger('LlmRouter');
  private readonly cooldownUntil = new Map<string, number>();

  constructor(
    private readonly providers: LlmProvider[],
    private readonly opts: RouterOptions,
    private readonly now: () => number = Date.now,
  ) {}

  get providerNames(): string[] {
    return this.providers.map((p) => p.name);
  }

  /** first provider to answer wins; null means "use the canned line" */
  async complete(messages: ChatMsg[]): Promise<{ text: string; provider: string } | null> {
    const started = this.now();
    for (const p of this.providers) {
      if ((this.cooldownUntil.get(p.name) ?? 0) > this.now()) continue;
      const remaining = this.opts.deadlineMs - (this.now() - started);
      if (remaining <= 50) break;
      try {
        const text = await p.complete(messages, AbortSignal.timeout(Math.min(this.opts.attemptTimeoutMs, remaining)));
        return { text, provider: p.name };
      } catch (e) {
        const status = e instanceof ProviderError ? e.status : undefined;
        // 429 = rate limited: honor Retry-After. Timeouts are not penalised (slow once != down).
        if (status === 429 || (status !== undefined && status >= 500)) {
          const wait = e instanceof ProviderError && e.retryAfterMs ? e.retryAfterMs : this.opts.defaultCooldownMs;
          this.cooldownUntil.set(p.name, this.now() + wait);
        } else if (status === 401 || status === 403) {
          this.cooldownUntil.set(p.name, this.now() + 10 * 60_000); // bad key: stop hammering
        }
        this.log.warn(`${p.name} failed: ${(e as Error).message}`);
      }
    }
    return null;
  }
}
