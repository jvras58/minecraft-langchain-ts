import { BotConfig } from '../types';

export const botConfig: BotConfig = {
  host: process.env.MINECRAFT_HOST || 'localhost',
  port: parseInt(process.env.MINECRAFT_PORT || '25565'),
  username: process.env.BOT_USERNAME || 'AgenteGroq',
  auth: (process.env.BOT_AUTH as 'offline' | 'microsoft') || 'offline',
  checkTimeoutInterval: 60 * 1000,
};

export const llmConfig = {
  provider: process.env.LLM_PROVIDER || 'groq',
  groq: {
    apiKey: process.env.GROQ_API_KEY || 'sua-chave-aqui',
  },
  ollama: {
    modelName: process.env.OLLAMA_MODEL || 'llama2',
  },
};