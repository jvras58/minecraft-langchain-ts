import * as si from 'systeminformation';
import { HardwareSnapshot } from '../types/types';
import { metricsConfig } from '../config/settings';

interface StaticInfo {
  cpuName: string;
  gpuName: string | null;
  os: string;
  cpu: { manufacturer: string; brand: string; cores: number; speed: number };
  memory: { total: number };
  gpu: Array<{ model: string; vendor: string; vram: number | null }>;
}

interface DynamicInfo {
  cpuUsage: number;
  ramUsed: number;
  ramFree: number;
  gpuUsage: number | null;
  gpuTemp: number | null;
}

/**
 * Coleta dados de hardware com cache agressivo.
 * - Info estática: coletada uma única vez (CPU model, GPU model, RAM total)
 * - Info dinâmica: throttled com intervalo configurável (CPU%, RAM livre, etc.)
 */
export class HardwareMonitor {
  private static instance: HardwareMonitor;
  private staticInfo: StaticInfo | null = null;
  private dynamicInfo: DynamicInfo | null = null;
  private lastDynamicTime = 0;

  static getInstance(): HardwareMonitor {
    if (!HardwareMonitor.instance) {
      HardwareMonitor.instance = new HardwareMonitor();
    }
    return HardwareMonitor.instance;
  }

  async getSnapshot(): Promise<HardwareSnapshot> {
    const s = await this.getStatic();
    const d = await this.getDynamic();

    return {
      cpuName: s.cpuName,
      gpuName: s.gpuName,
      os: s.os,
      environment: {
        cpu: s.cpu,
        memory: s.memory,
        gpu: s.gpu,
        dynamic: d,
      },
    };
  }

  private async getStatic(): Promise<StaticInfo> {
    if (this.staticInfo) return this.staticInfo;

    const [cpu, mem, gpu] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.graphics(),
    ]);

    const cpuName = [cpu.manufacturer, cpu.brand].filter(Boolean).join(' ').trim();

    this.staticInfo = {
      cpuName,
      gpuName: gpu.controllers[0]?.model ?? null,
      os: process.platform,
      cpu: { manufacturer: cpu.manufacturer, brand: cpu.brand, cores: cpu.cores, speed: cpu.speed },
      memory: { total: mem.total },
      gpu: gpu.controllers.map((g) => ({ model: g.model, vendor: g.vendor, vram: g.vram })),
    };

    return this.staticInfo;
  }

  private async getDynamic(): Promise<DynamicInfo> {
    const now = performance.now();
    if (this.dynamicInfo && now - this.lastDynamicTime < metricsConfig.hardwarePollIntervalMs) {
      return this.dynamicInfo;
    }

    const [load, mem, gpu] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
    ]);

    const primary = gpu.controllers[0];
    this.dynamicInfo = {
      cpuUsage: load.currentLoad,
      ramUsed: mem.active,
      ramFree: mem.free,
      gpuUsage: primary?.utilizationGpu ?? null,
      gpuTemp: primary?.temperatureGpu ?? null,
    };
    this.lastDynamicTime = now;

    return this.dynamicInfo;
  }
}