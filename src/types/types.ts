// ─── Bot Config ───────────────────────────────────────────────
export interface BotConfig {
  host: string;
  port: number;
  username: string;
  auth: 'offline' | 'microsoft';
  checkTimeoutInterval: number;
}

// ─── Actions (fonte da verdade: Zod schema) ──────────────
export type { BotAction as BotAction } from '../schemas/botAction';

// ─── Perception ───────────────────────────────────────────────
export interface GameContext {
  vida: number;
  fome: number;
  posicao: { x: number; y: number; z: number };
  estaAndando: boolean;
  jogadoresProximos: string[];
  entidadesProximas: EntityInfo[];
  blocosProximos: BlockInfo[];
  horaDoDia: number;
  clima: string;
  inventario: InventoryItem[];
  bioma: string;
}

export interface EntityInfo {
  nome: string;
  tipo: string;
  distancia: number;
  vida?: number;
}

export interface BlockInfo {
  nome: string;
  posicao: { x: number; y: number; z: number };
  distancia: number;
}

export interface InventoryItem {
  nome: string;
  quantidade: number;
  slot: number;
}

// ─── Memory ───────────────────────────────────────────────────
export interface MemoryEntry {
  timestamp: number;
  tipo: 'acao' | 'evento' | 'observacao' | 'interacao';
  resumo: string;
  dados?: Record<string, unknown>;
}

// ─── LLM Provider ─────────────────────────────────────────────
export interface LLMProvider {
  readonly providerName: string;
  readonly modelName: string;
  invoke(
    messages: ChatMessage[],
    options?: InvokeOptions,
  ): Promise<LLMResponse>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InvokeOptions {
  temperature?: number;
  maxTokens?: number;
  userBotId?: string;
  taskName?: string;
}

export interface LLMResponse {
  content: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  responseTimeMs: number;
}

// ─── Prompts ──────────────────────────────────────────────────
export interface PromptTemplate {
  system: string;
  human: string;
}

// ─── Metrics ──────────────────────────────────────────────────
export interface LLMMetricData {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  responseTimeMs: number;
  userBotId: string;
  taskName?: string;
}

export interface ActionMetricData {
  userBotId: string;
  action: string;
  direction?: string;
  content?: string;
  success: boolean;
  errorMessage?: string;
  executionTimeMs: number;
}

export interface HardwareSnapshot {
  cpuName: string;
  gpuName: string | null;
  os: string;
  environment: Record<string, unknown>; // JSON nativo no PostgreSQL — sem stringify
}