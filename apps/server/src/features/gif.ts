import { Logger } from '@nestjs/common';

export interface GifFinder {
  /** a https GIF url for the search term, or null (no key, no result, timeout, bad host) */
  find(query: string): Promise<string | null>;
}

const log = new Logger('Gif');

/**
 * Optional GIPHY lookup (GIPHY_API_KEY). Never blocks a roast: the caller posts the line first and
 * attaches the GIF afterwards. Only giphy.com URLs are accepted, so a bad response cannot make the UI load arbitrary hosts.
 */
export class GiphyFinder implements GifFinder {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly base = 'https://api.giphy.com',
  ) {}

  async find(query: string): Promise<string | null> {
    try {
      const url = `${this.base}/v1/gifs/search?${new URLSearchParams({ api_key: this.apiKey, q: query, limit: '12', rating: 'pg-13', lang: 'en' })}`;
      const res = await this.fetchImpl(url, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: { images?: { fixed_height?: { url?: string } } }[] };
      const urls = (json.data ?? []).map((d) => d.images?.fixed_height?.url).filter((u): u is string => !!u && isGiphyUrl(u));
      return urls.length ? urls[Math.floor(Math.random() * urls.length)]! : null;
    } catch (e) {
      log.warn(`giphy lookup failed: ${(e as Error).message}`);
      return null;
    }
  }
}

export function isGiphyUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' && (x.hostname === 'giphy.com' || x.hostname.endsWith('.giphy.com'));
  } catch {
    return false;
  }
}
