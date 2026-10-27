export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export interface LlmProvider {
  readonly name: string;
  complete(messages: ChatMsg[], signal: AbortSignal): Promise<string>;
}

function retryAfter(res: Response): number | undefined {
  const h = res.headers.get('retry-after');
  const s = h ? Number(h) : NaN;
  return Number.isFinite(s) ? s * 1000 : undefined;
}

async function postJson(url: string, apiKey: string, body: unknown, signal: AbortSignal): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new ProviderError(`HTTP ${res.status}`, res.status, retryAfter(res));
  return res.json();
}

/**
 * OpenAI-compatible chat completions (Groq). Plain text out: Groq's structured outputs are
 * reported flaky on gpt-oss, and we only need one line.
 */
export function openAiCompatProvider(o: { name: string; baseUrl: string; apiKey: string; model: string; reasoningEffort?: 'low' | 'medium' | 'high' }): LlmProvider {
  return {
    name: o.name,
    async complete(messages, signal) {
      const json = await postJson(
        `${o.baseUrl}/chat/completions`,
        o.apiKey,
        {
          model: o.model,
          messages,
          temperature: 1,
          // reasoning tokens count against this on gpt-oss, so leave room for the answer itself
          max_completion_tokens: 400,
          ...(o.reasoningEffort ? { reasoning_effort: o.reasoningEffort } : {}),
        },
        signal,
      );
      const text = json?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new ProviderError('empty completion');
      return text;
    },
  };
}

/** Ollama Cloud native API: POST {base}/api/chat, Bearer key, model "gpt-oss:120b". */
export function ollamaProvider(o: { name: string; baseUrl: string; apiKey: string; model: string }): LlmProvider {
  return {
    name: o.name,
    async complete(messages, signal) {
      const json = await postJson(`${o.baseUrl}/api/chat`, o.apiKey, { model: o.model, messages, stream: false, think: 'low' }, signal);
      const text = json?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new ProviderError('empty completion');
      return text;
    },
  };
}
