// ─── Bot Config ───────────────────────────────────────────────
export interface BotConfig {
  host: string;
  port: number;
  username: string;
  auth: 'offline' | 'microsoft';
  checkTimeoutInterval: number;
}

// ─── Actions (fonte da verdade: Zod schema) ──────────────
export type { BotAction } from '../schemas/botAction';

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
  sessionId?: string;
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
  localInputTokens?: number;
  localOutputTokens?: number;
  tokensPerSecond?: number;
  totalTokens?: number;
  responseTimeMs: number;
  userBotId: string;
  sessionId?: string;
  taskName?: string;
  hardwareBefore?: DynamicHardwareInfo;
  hardwareAfter?: DynamicHardwareInfo;
}

export interface ActionMetricData {
  userBotId: string;
  sessionId?: string;
  action: string;
  direction?: string;
  content?: string;
  success: boolean;
  errorMessage?: string;
  executionTimeMs: number;
}

export interface ParseEventData {
  sessionId?: string;
  status: 'valid' | 'repaired' | 'failed';
  rawResponse?: string;
  errorMessage?: string;
}

export interface ConnectionEventData {
  sessionId?: string;
  eventType: 'connected' | 'disconnected' | 'reconnected' | 'kicked' | 'death';
  reason?: string;
}

export interface DynamicHardwareInfo {
  cpuUsage: number;
  ramUsed: number;
  ramFree: number;
  gpuUsage: number | null;
  gpuTemp: number | null;
}

export interface StaticHardwareInfo {
  cpuName: string;
  gpuName: string | null;
  os: string;
  cpu: { manufacturer: string; brand: string; cores: number; speed: number };
  memory: { total: number };
  gpu: Array<{ model: string; vendor: string; vram: number | null }>;
}

export interface HardwareSnapshot {
  cpuName: string;
  gpuName: string | null;
  os: string;
  environment: Record<string, unknown>;
}

// ─── Model Info ───────────────────────────────────────────────
export interface ModelDetails {
  family: string;
  parameterSize: string;
  quantization: string;
  sizeBytes: number;
  contextLength: number;
  vramAllocated?: number;
}

export interface ModelInfoProvider {
  getModelDetails(): Promise<Partial<ModelDetails> | null>;
}

// ─── Session ──────────────────────────────────────────────────
export interface SessionConfig {
  provider: string;
  model: string;
  userBotId: string;
  mode?: 'gameplay' | 'benchmark';
  notes?: string;
  modelInfoProvider?: ModelInfoProvider;
}