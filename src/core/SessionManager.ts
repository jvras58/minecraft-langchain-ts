import { prisma } from '../utils/db';
import { HardwareMonitor } from '../metrics/HardwareMonitor';
import { SessionConfig, ModelInfoProvider } from '../types/types';

type CounterType = 'valid' | 'repaired' | 'failed' | 'disconnect' | 'reconnect';

/**
 * Gerencia sessões de experimento.
 *
 * Cada execução do bot = 1 sessão identificável no banco.
 * Acumula contadores em memória e salva no shutdown.
 */
export class SessionManager {
  private sessionId: string | null = null;
  private counters = {
    total: 0,
    valid: 0,
    repaired: 0,
    failed: 0,
    disconnects: 0,
    reconnects: 0,
  };

  async startSession(config: SessionConfig): Promise<string> {
    // Captura hardware estático
    let hardwareProfile: Record<string, unknown> = {};
    try {
      const hw = await HardwareMonitor.getInstance().getStaticSnapshot();
      hardwareProfile = {
        cpuName: hw.cpuName,
        gpuName: hw.gpuName,
        os: hw.os,
        cpu: hw.cpu,
        memory: hw.memory,
        gpu: hw.gpu,
      };
    } catch (err) {
      console.error('Erro ao capturar hardware para sessão:', err);
    }

    // Captura metadados do modelo (se disponível)
    let modelDetails: Partial<{
      family: string;
      parameterSize: string;
      quantization: string;
      sizeBytes: number;
      contextLength: number;
      vramAllocated: number;
    }> = {};

    if (config.modelInfoProvider) {
      try {
        const details = await config.modelInfoProvider.getModelDetails();
        if (details) modelDetails = details;
      } catch (err) {
        console.error('Erro ao capturar metadados do modelo:', err);
      }
    }

    const session = await prisma.experimentSession.create({
      data: {
        provider: config.provider,
        model: config.model,
        userBotId: config.userBotId,
        mode: config.mode || 'gameplay',
        notes: config.notes,
        hardwareProfile: hardwareProfile as any,
        quantization: modelDetails.quantization,
        modelFamily: modelDetails.family,
        parameterSize: modelDetails.parameterSize,
        modelSizeBytes: modelDetails.sizeBytes ? BigInt(modelDetails.sizeBytes) : null,
        vramAllocatedBytes: modelDetails.vramAllocated ? BigInt(modelDetails.vramAllocated) : null,
        contextLength: modelDetails.contextLength,
      },
    });

    this.sessionId = session.id;
    this.resetCounters();

    console.log(`📋 Sessão iniciada: ${this.sessionId}`);
    return this.sessionId;
  }

  incrementCounter(type: CounterType): void {
    this.counters.total++;
    switch (type) {
      case 'valid':
        this.counters.valid++;
        break;
      case 'repaired':
        this.counters.repaired++;
        break;
      case 'failed':
        this.counters.failed++;
        break;
      case 'disconnect':
        this.counters.disconnects++;
        break;
      case 'reconnect':
        this.counters.reconnects++;
        break;
    }
  }

  async endSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await prisma.experimentSession.update({
        where: { id: this.sessionId },
        data: {
          endedAt: new Date(),
          totalCycles: this.counters.total,
          validJsonCount: this.counters.valid,
          repairedJsonCount: this.counters.repaired,
          failedJsonCount: this.counters.failed,
          disconnections: this.counters.disconnects,
          reconnections: this.counters.reconnects,
        },
      });
      console.log(`📋 Sessão finalizada: ${this.sessionId}`);
    } catch (err) {
      console.error('Erro ao finalizar sessão:', err);
    }

    this.sessionId = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  private resetCounters(): void {
    this.counters = { total: 0, valid: 0, repaired: 0, failed: 0, disconnects: 0, reconnects: 0 };
  }
}
