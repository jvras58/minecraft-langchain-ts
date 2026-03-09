import { prisma } from '../utils/db';
import { Prisma } from '@prisma/client';
import { LLMMetricData, ActionMetricData, HardwareSnapshot } from '../types/types';
import { HardwareMonitor } from './HardwareMonitor';
import { metricsConfig } from '../config/settings';

interface QueuedLLMMetric extends LLMMetricData {
  timestamp: Date;
  hardware?: HardwareSnapshot;
}

interface QueuedActionMetric extends ActionMetricData {
  timestamp: Date;
}

/**
 * Acumula métricas em memória e grava no banco em lotes.
 *
 * Por que isso importa:
 * - Cada escrita individual no banco envolve transação, I/O e possível latência de rede (ex.: PostgreSQL)
 * - Com LLM local (Ollama), o bot pode gerar 10+ métricas por minuto
 * - Batch de 20 métricas = 1 transação em vez de 20 transações separadas
 * - Reduz significativamente o overhead de I/O/round-trips de métricas
 */
export class MetricsBatcher {
  private static instance: MetricsBatcher;

  private llmQueue: QueuedLLMMetric[] = [];
  private actionQueue: QueuedActionMetric[] = [];
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
    // Não impede o processo de encerrar
    this.flushTimer.unref();
    console.log(`📊 MetricsBatcher iniciado (flush a cada ${metricsConfig.batchFlushIntervalMs / 1000}s)`);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Enfileira métrica de LLM. Hardware snapshot é capturado aqui (throttled). */
  async pushLLMMetric(data: LLMMetricData): Promise<void> {
    const hardware = await HardwareMonitor.getInstance().getSnapshot();
    this.llmQueue.push({ ...data, timestamp: new Date(), hardware });

    if (this.llmQueue.length + this.actionQueue.length >= metricsConfig.batchMaxSize) {
      this.flush();
    }
  }

  /** Enfileira métrica de ação. Leve - sem I/O. */
  pushActionMetric(data: ActionMetricData): void {
    this.actionQueue.push({ ...data, timestamp: new Date() });

    if (this.llmQueue.length + this.actionQueue.length >= metricsConfig.batchMaxSize) {
      this.flush();
    }
  }

  /** Grava tudo no banco em uma única transação. */
  async flush(): Promise<void> {
    if (this.isFlushing) {
      this.pendingFlush = true;
      return;
    }
    if (this.llmQueue.length === 0 && this.actionQueue.length === 0) return;

    this.isFlushing = true;

    // Snapshot das filas e limpa imediatamente (não bloqueia novas métricas)
    const llmBatch = this.llmQueue.splice(0);
    const actionBatch = this.actionQueue.splice(0);

    try {
      await prisma.$transaction([
        // Métricas de LLM
        ...llmBatch.map((m) =>
          prisma.metric.create({
            data: {
              userBotId: m.userBotId,
              timestamp: m.timestamp,
              provider: m.provider,
              model: m.model,
              inputTokens: m.inputTokens,
              outputTokens: m.outputTokens,
              responseTime: m.responseTimeMs / 1000, // Armazena em segundos
              gpuName: m.hardware?.gpuName,
              cpuName: m.hardware?.cpuName,
              os: m.hardware?.os,
              taskName: m.taskName,
              environment: (m.hardware?.environment ?? {}) as Prisma.InputJsonValue,
            },
          })
        ),
        // Métricas de ação
        ...actionBatch.map((m) =>
          prisma.actionMetric.create({
            data: {
              userBotId: m.userBotId,
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
      ]);

      if (llmBatch.length + actionBatch.length > 0) {
        console.log(
          `📊 Flush: ${llmBatch.length} LLM + ${actionBatch.length} ações gravadas`,
        );
      }
    } catch (err) {
      console.error('❌ Erro ao gravar métricas em lote:', err);
      // Devolve para a fila para tentar novamente
      this.llmQueue.unshift(...llmBatch);
      this.actionQueue.unshift(...actionBatch);
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