import { prisma } from '../utils/db';
import { Prisma } from '@prisma/client';
import {
  LLMMetricData,
  ActionMetricData,
  ParseEventData,
  ConnectionEventData,
  HardwareSnapshot,
} from '../types/types';
import { HardwareMonitor } from './HardwareMonitor';
import { metricsConfig } from '../config/settings';

interface QueuedLLMMetric extends LLMMetricData {
  timestamp: Date;
  hardware?: HardwareSnapshot;
}

interface QueuedActionMetric extends ActionMetricData {
  timestamp: Date;
}

interface QueuedParseEvent extends ParseEventData {
  timestamp: Date;
}

interface QueuedConnectionEvent extends ConnectionEventData {
  timestamp: Date;
}

/**
 * Acumula métricas em memória e grava no banco em lotes.
 *
 * Filas:
 * - llmQueue: métricas de chamadas LLM
 * - actionQueue: métricas de ações do bot
 * - parseEventQueue: eventos de parse JSON (válido/reparado/falho)
 * - connectionEventQueue: eventos de conexão/desconexão
 */
export class MetricsBatcher {
  private static instance: MetricsBatcher;

  private llmQueue: QueuedLLMMetric[] = [];
  private actionQueue: QueuedActionMetric[] = [];
  private parseEventQueue: QueuedParseEvent[] = [];
  private connectionEventQueue: QueuedConnectionEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;
  private pendingFlush = false;

  static getInstance(): MetricsBatcher {
    if (!MetricsBatcher.instance) {
      MetricsBatcher.instance = new MetricsBatcher();
    }
    return MetricsBatcher.instance;
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(
      () => this.flush(),
      metricsConfig.batchFlushIntervalMs,
    );
    this.flushTimer.unref();
    console.log(`📊 MetricsBatcher iniciado (flush a cada ${metricsConfig.batchFlushIntervalMs / 1000}s)`);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private get totalQueued(): number {
    return this.llmQueue.length + this.actionQueue.length
      + this.parseEventQueue.length + this.connectionEventQueue.length;
  }

  /** Enfileira métrica de LLM. Hardware snapshot é capturado aqui (throttled). */
  async pushLLMMetric(data: LLMMetricData): Promise<void> {
    const hardware = await HardwareMonitor.getInstance().getSnapshot();
    this.llmQueue.push({ ...data, timestamp: new Date(), hardware });

    if (this.totalQueued >= metricsConfig.batchMaxSize) {
      this.flush();
    }
  }

  /** Enfileira métrica de ação. Leve - sem I/O. */
  pushActionMetric(data: ActionMetricData): void {
    this.actionQueue.push({ ...data, timestamp: new Date() });

    if (this.totalQueued >= metricsConfig.batchMaxSize) {
      this.flush();
    }
  }

  /** Enfileira evento de parse JSON. */
  pushParseEvent(data: ParseEventData): void {
    this.parseEventQueue.push({ ...data, timestamp: new Date() });

    if (this.totalQueued >= metricsConfig.batchMaxSize) {
      this.flush();
    }
  }

  /** Enfileira evento de conexão. */
  pushConnectionEvent(data: ConnectionEventData): void {
    this.connectionEventQueue.push({ ...data, timestamp: new Date() });

    if (this.totalQueued >= metricsConfig.batchMaxSize) {
      this.flush();
    }
  }

  /** Grava tudo no banco em uma única transação. */
  async flush(): Promise<void> {
    if (this.isFlushing) {
      this.pendingFlush = true;
      return;
    }
    if (this.totalQueued === 0) return;

    this.isFlushing = true;

    const llmBatch = this.llmQueue.splice(0);
    const actionBatch = this.actionQueue.splice(0);
    const parseBatch = this.parseEventQueue.splice(0);
    const connBatch = this.connectionEventQueue.splice(0);

    try {
      await prisma.$transaction([
        // Métricas de LLM
        ...llmBatch.map((m) =>
          prisma.metric.create({
            data: {
              userBotId: m.userBotId,
              sessionId: m.sessionId,
              timestamp: m.timestamp,
              provider: m.provider,
              model: m.model,
              inputTokens: m.inputTokens,
              outputTokens: m.outputTokens,
              localInputTokens: m.localInputTokens,
              localOutputTokens: m.localOutputTokens,
              tokensPerSecond: m.tokensPerSecond,
              totalTokens: m.totalTokens,
              responseTime: m.responseTimeMs / 1000,
              gpuName: m.hardware?.gpuName,
              cpuName: m.hardware?.cpuName,
              os: m.hardware?.os,
              taskName: m.taskName,
              environment: (m.hardware?.environment ?? {}) as Prisma.InputJsonValue,
              environmentBefore: m.hardwareBefore ? (m.hardwareBefore as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
              environmentAfter: m.hardwareAfter ? (m.hardwareAfter as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            },
          })
        ),
        // Métricas de ação
        ...actionBatch.map((m) =>
          prisma.actionMetric.create({
            data: {
              userBotId: m.userBotId,
              sessionId: m.sessionId,
              timestamp: m.timestamp,
              action: m.action,
              direction: m.direction,
              content: m.content,
              success: m.success,
              errorMessage: m.errorMessage,
              executionTimeMs: m.executionTimeMs,
            },
          })
        ),
        // Eventos de parse
        ...parseBatch.map((m) =>
          prisma.parseEvent.create({
            data: {
              sessionId: m.sessionId,
              timestamp: m.timestamp,
              status: m.status,
              rawResponse: m.rawResponse,
              errorMessage: m.errorMessage,
            },
          })
        ),
        // Eventos de conexão
        ...connBatch.map((m) =>
          prisma.connectionEvent.create({
            data: {
              sessionId: m.sessionId,
              timestamp: m.timestamp,
              eventType: m.eventType,
              reason: m.reason,
            },
          })
        ),
      ]);

      const total = llmBatch.length + actionBatch.length + parseBatch.length + connBatch.length;
      if (total > 0) {
        console.log(
          `📊 Flush: ${llmBatch.length} LLM + ${actionBatch.length} ações + ${parseBatch.length} parse + ${connBatch.length} conexão`,
        );
      }
    } catch (err) {
      console.error('❌ Erro ao gravar métricas em lote:', err);
      this.llmQueue.unshift(...llmBatch);
      this.actionQueue.unshift(...actionBatch);
      this.parseEventQueue.unshift(...parseBatch);
      this.connectionEventQueue.unshift(...connBatch);
    } finally {
      this.isFlushing = false;
      if (this.pendingFlush) {
        this.pendingFlush = false;
        void this.flush();
      }
    }
  }

  /** Flush final antes de encerrar o processo. */
  async shutdown(): Promise<void> {
    this.stop();
    await this.flush();
    console.log('📊 MetricsBatcher encerrado.');
  }
}
