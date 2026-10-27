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
  llmOrder: string[];
  attemptTimeoutMs: number;
  deadlineMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const origins = list(env.CORS_ORIGINS);
  return {
    port: Number(env.PORT ?? 4000),
    adminKey: env.ADMIN_KEY || null,
    corsOrigins: origins.length ? origins : true,
    databaseUrl: env.DATABASE_URL || null,
    databaseSsl: env.DATABASE_SSL !== 'false',
    groqKey: env.GROQ_API_KEY || null,
    groqBase: env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    ollamaKey: env.OLLAMA_API_KEY || null,
    ollamaBase: env.OLLAMA_BASE_URL || 'https://ollama.com',
    llmOrder: list(env.LLM_ORDER).length ? list(env.LLM_ORDER) : ['groq-120b', 'groq-20b', 'ollama'],
    attemptTimeoutMs: Number(env.LLM_ATTEMPT_TIMEOUT_MS ?? 2500),
    deadlineMs: Number(env.LLM_DEADLINE_MS ?? 3500),
  };
}
