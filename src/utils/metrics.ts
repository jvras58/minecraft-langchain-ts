import { prisma } from './db';
import * as si from 'systeminformation';

export interface MetricData {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  responseTime: number;
  userBotId: string;
  taskName?: string;
}

let cachedStaticInfo: StaticHardwareInfo | null = null;

let lastDynamicMetrics: DynamicMetrics | null = null;
let lastDynamicCollectionTime: number = 0;
const DYNAMIC_METRICS_INTERVAL = 5000;

interface StaticHardwareInfo {
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    speed: number;
  };
  memory: {
    total: number;
  };
  gpu: Array<{
    model: string;
    vendor: string;
    vram: number | null;
  }>;
}

interface DynamicMetrics {
  cpuUsage: number;
  ramUsed: number;
  ramFree: number;
  gpuUsage: number | null;
  vramUsed: number | null;
  gpuTemp: number | null;
}

/**
 * Coleta informações do Bot
 * Inclui: nome do bot
 */
export async function getOrCreateUserBot(name: string): Promise<string> {
  let userBot = await prisma.userBot.findFirst({
    where: { name },
  });

  if (!userBot) {
    userBot = await prisma.userBot.create({
      data: { name },
    });
  }

  return userBot.id;
}

/**
 * Coleta informações estáticas do hardware (cacheadas após primeira chamada)
 * Inclui: modelo CPU, modelo GPU, RAM total
 */
async function getStaticHardwareInfo(): Promise<StaticHardwareInfo> {
  if (cachedStaticInfo) {
    return cachedStaticInfo;
  }

  const [cpu, mem, gpu] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.graphics(),
  ]);

  cachedStaticInfo = {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      speed: cpu.speed,
    },
    memory: {
      total: mem.total,
    },
    gpu: gpu.controllers.map(g => ({
      model: g.model,
      vendor: g.vendor,
      vram: g.vram,
    })),
  };

  return cachedStaticInfo;
}

/**
 * Coleta métricas dinâmicas em tempo real
 * Inclui: uso CPU%, RAM usada, uso GPU%, VRAM usada, temperatura GPU
 */
async function getDynamicMetrics(): Promise<DynamicMetrics> {
  const [load, mem, gpu] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.graphics(),
  ]);

  const primaryGpu = gpu.controllers[0];

  return {
    cpuUsage: load.currentLoad,
    ramUsed: mem.active,
    ramFree: mem.free,
    gpuUsage: primaryGpu?.utilizationGpu ?? null,
    vramUsed: primaryGpu?.memoryUsed ?? null,
    gpuTemp: primaryGpu?.temperatureGpu ?? null,
  };
}

/**
 * Coleta métricas de hardware e armazena junto com dados de inferência do LLM.
 * 
 * Esta função combina métricas dinâmicas do sistema (uso de CPU/GPU, RAM) 
 * com informações estáticas de hardware e os dados de inferência fornecidos,
 * persistindo tudo no banco de dados.
 */
export async function collectAndStoreMetric(data: MetricData): Promise<void> {
  const staticInfo = await getStaticHardwareInfo();

  let dynamicMetrics: DynamicMetrics;
  if (lastDynamicMetrics === null || performance.now() - lastDynamicCollectionTime > DYNAMIC_METRICS_INTERVAL) {
    dynamicMetrics = await getDynamicMetrics();
    lastDynamicMetrics = dynamicMetrics;
    lastDynamicCollectionTime = performance.now();
  } else {
    dynamicMetrics = lastDynamicMetrics;
  }

  const gpuName = staticInfo.gpu[0]?.model ?? null;
  const cpuName = [staticInfo.cpu.manufacturer, staticInfo.cpu.brand]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(' ');
  const os = process.platform;
  const environment = {
    cpu: staticInfo.cpu,
    memory: staticInfo.memory,
    gpu: staticInfo.gpu,
    dynamic: dynamicMetrics,
  };

  await prisma.metric.create({
    data: {
      ...data,
      gpuName,
      cpuName,
      os,
      environment: JSON.stringify(environment),
    },
  });
}

/**
 * Reseta o cache de informações estáticas
 */
export function resetStaticCache(): void {
  cachedStaticInfo = null;
}

/**
 * Interface para dados de métrica de ação.
 * 
 * Esta interface define os campos necessários para coletar métricas de ação,
 * incluindo informações sobre a ação executada, sucesso, tempo de execução,
 * e conteúdo ou direção relevantes.
 */
export interface ActionMetricData {
  userBotId: string;
  /** Ação executada: "FALAR", "ANDAR", "PULAR", etc. */
  action: string;
  /** Direção para ação ANDAR */
  direction?: string;
  /** Conteúdo para ação FALAR */
  content?: string;
  /** Se a ação foi executada com sucesso */
  success: boolean;
  /** Mensagem de erro se falhou */
  errorMessage?: string;
  /**
   * Tempo de execução da ação em milissegundos (ms).
   * Deve corresponder à unidade armazenada em actionMetric.executionTime no Prisma.
   */
  executionTime: number;
}

/**
 * Salva métricas de execução de uma ação do bot.
 * Separado das métricas de LLM para rastrear o que o bot fez e se foi bem sucedido.
 */
export async function collectActionMetric(data: ActionMetricData): Promise<void> {
  const userBot = await prisma.userBot.findUnique({
    where: { id: data.userBotId },
  });
  if (!userBot) {
    throw new Error(`UserBot com ID ${data.userBotId} não existe.`);
  }

  await prisma.actionMetric.create({
    data: {
      userBotId: data.userBotId,
      action: data.action,
      direction: data.direction,
      content: data.content,
      success: data.success,
      errorMessage: data.errorMessage,
      executionTime: data.executionTime,
    },
  });
}