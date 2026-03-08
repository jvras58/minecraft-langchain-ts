import { BotConfig } from '../types/types';

export const botConfig: BotConfig = {
  host: process.env.MINECRAFT_HOST || 'localhost',
  port: parseInt(process.env.MINECRAFT_PORT || '25565'),
  username: process.env.BOT_USERNAME || 'AgenteBot',
  auth: (process.env.BOT_AUTH as 'offline' | 'microsoft') || 'offline',
  checkTimeoutInterval: 60_000,
};

export const llmConfig = {
  provider: process.env.LLM_PROVIDER || 'groq',
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  ollama: {
    model: process.env.OLLAMA_MODEL || 'llama2',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },
};

export const metricsConfig = {
  /** Intervalo em ms para flush de métricas em lote */
  batchFlushIntervalMs: 10_000,
  /** Tamanho máximo do lote antes de forçar flush */
  batchMaxSize: 20,
  /** Intervalo mínimo entre coletas de métricas dinâmicas de hardware */
  hardwarePollIntervalMs: 5_000,
};

export const agentConfig = {
  /** Intervalo entre ciclos do loop principal (ms) */
  loopIntervalMs: 3_000,
  /** Intervalo de espera quando desconectado (ms) */
  disconnectedWaitMs: 2_000,
  /** Tamanho máximo da memória de curto prazo */
  shortTermMemorySize: 15,
  /** Raio de percepção para blocos (em blocos) */
  perceptionBlockRadius: 8,
  /** Raio de percepção para entidades (em blocos) */
  perceptionEntityRadius: 16,
};