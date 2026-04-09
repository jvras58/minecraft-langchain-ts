import * as si from 'systeminformation';
import { HardwareSnapshot, DynamicHardwareInfo, StaticHardwareInfo } from '../types/types';
import { metricsConfig } from '../config/settings';

/**
 * Coleta dados de hardware com cache agressivo.
 * - Info estática: coletada uma única vez (CPU model, GPU model, RAM total)
 * - Info dinâmica: throttled com intervalo configurável (CPU%, RAM livre, etc.)
 */
export class HardwareMonitor {
  private static instance: HardwareMonitor;
  private staticInfo: StaticHardwareInfo | null = null;
  private dynamicInfo: DynamicHardwareInfo | null = null;
  private lastDynamicTime = 0;
  private staticInfoPromise: Promise<StaticHardwareInfo> | null = null;
  private dynamicInfoPromise: Promise<DynamicHardwareInfo> | null = null;

  static getInstance(): HardwareMonitor {
    if (!HardwareMonitor.instance) {
      HardwareMonitor.instance = new HardwareMonitor();
    }
    return HardwareMonitor.instance;
  }

  /** Snapshot completo (estático + dinâmico) para métricas de LLM. */
  async getSnapshot(): Promise<HardwareSnapshot> {
    const s = await this.getStaticSnapshot();
    const d = await this.getDynamicSnapshot();

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

  /** Snapshot estático — coletado 1x por sessão. */
  async getStaticSnapshot(): Promise<StaticHardwareInfo> {
    return this.getStatic();
  }

  /** Snapshot dinâmico — para captura antes/depois de inferência. */
  async getDynamicSnapshot(): Promise<DynamicHardwareInfo> {
    return this.getDynamic();
  }

  private getStatic(): Promise<StaticHardwareInfo> {
    if (this.staticInfo) return Promise.resolve(this.staticInfo);
    if (this.staticInfoPromise) return this.staticInfoPromise;

    this.staticInfoPromise = Promise.all([
      si.cpu(),
      si.mem(),
      si.graphics(),
    ]).then(([cpu, mem, gpu]) => {
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
    }).catch((err) => {
      this.staticInfoPromise = null;
      throw err;
    }).then((info) => {
      this.staticInfoPromise = null;
      return info;
    });

    return this.staticInfoPromise;
  }

  private getDynamic(): Promise<DynamicHardwareInfo> {
    const now = performance.now();
    if (this.dynamicInfo && now - this.lastDynamicTime < metricsConfig.hardwarePollIntervalMs) {
      return Promise.resolve(this.dynamicInfo);
    }
    if (this.dynamicInfoPromise) return this.dynamicInfoPromise;

    this.dynamicInfoPromise = Promise.all([
      si.currentLoad(),
      si.mem(),
      si.graphics(),
    ]).then(([load, mem, gpu]) => {
      const primary = gpu.controllers[0];
      this.dynamicInfo = {
        cpuUsage: load.currentLoad,
        ramUsed: mem.active,
        ramFree: mem.free,
        gpuUsage: primary?.utilizationGpu ?? null,
        gpuTemp: primary?.temperatureGpu ?? null,
      };
      this.lastDynamicTime = performance.now();
      return this.dynamicInfo;
    }).catch((err) => {
      this.dynamicInfoPromise = null;
      throw err;
    }).then((info) => {
      this.dynamicInfoPromise = null;
      return info;
    });

    return this.dynamicInfoPromise;
  }
}
