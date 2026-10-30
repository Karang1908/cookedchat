export interface Config {
  port: number;
  adminKey: string | null;
  /** true = reflect any origin (dev) */
  corsOrigins: string[] | true;
  databaseUrl: string | null;
  databaseSsl: boolean;
  groqKey: string | null;
  groqBase: string;
  ollamaKey: string | null;
  ollamaBase: string;
  /** model name as /api/tags on ollama.com lists it (no "-cloud" suffix over the API) */
  ollamaModel: string;
  giphyKey: string | null;
  giphyBase: string;
  llmOrder: string[];
  attemptTimeoutMs: number;
  deadlineMs: number;
}

/** Values in .env.example that were pasted without being filled in. */
const PLACEHOLDER = /REPLACE_ME|xxxxxxxx|your-|<.+>/i;

export const isPlaceholder = (v?: string) => !!v && PLACEHOLDER.test(v);

/** Keys still holding an .env.example placeholder; they are treated as unset. */
export function placeholderKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  const keys = ['ADMIN_KEY', 'CORS_ORIGINS', 'DATABASE_URL', 'GROQ_API_KEY', 'OLLAMA_API_KEY', 'GIPHY_API_KEY'];
  return keys.filter((k) => isPlaceholder(env[k]));
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const real = (v?: string) => (v && !isPlaceholder(v) ? v : null);
  const list = (v?: string) => (real(v) ? v!.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const origins = list(env.CORS_ORIGINS);
  return {
    port: Number(env.PORT ?? 4000),
    adminKey: real(env.ADMIN_KEY),
    corsOrigins: origins.length ? origins : true,
    databaseUrl: real(env.DATABASE_URL),
    databaseSsl: env.DATABASE_SSL !== 'false',
    groqKey: real(env.GROQ_API_KEY),
    groqBase: env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    ollamaKey: real(env.OLLAMA_API_KEY),
    ollamaBase: env.OLLAMA_BASE_URL || 'https://ollama.com',
    ollamaModel: env.OLLAMA_MODEL || 'gemma4:31b',
    giphyKey: real(env.GIPHY_API_KEY),
    giphyBase: env.GIPHY_BASE_URL || 'https://api.giphy.com',
    llmOrder: list(env.LLM_ORDER).length ? list(env.LLM_ORDER) : ['groq-120b', 'groq-20b', 'ollama'],
    attemptTimeoutMs: Number(env.LLM_ATTEMPT_TIMEOUT_MS ?? 2500),
    deadlineMs: Number(env.LLM_DEADLINE_MS ?? 3500),
  };
}
