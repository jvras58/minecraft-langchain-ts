import { prisma } from './db';
import * as si from 'systeminformation';

export interface MetricData {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  responseTime: number;
  userBotId: string;
}

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

export async function collectAndStoreMetric(data: MetricData) {
  const environment = await getEnvironmentInfo();
  await prisma.metric.create({
    data: {
      ...data,
      environment: JSON.stringify(environment),
    },
  });
}

async function getEnvironmentInfo() {
  const [cpu, mem, gpu] = await Promise.all([
    si.cpu(),
    si.mem(),
    si.graphics(),
  ]);

  return {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores,
      speed: cpu.speed,
    },
    memory: {
      total: mem.total,
      free: mem.free,
    },
    gpu: gpu.controllers.map(g => ({
      model: g.model,
      vendor: g.vendor,
      vram: g.vram,
    })),
  };
}