import { ModelDetails, ModelInfoProvider } from '../types/types';

/**
 * Captura metadados do modelo via API do Ollama.
 *
 * Usa dois endpoints:
 * - POST /api/show → family, parameter_size, quantization_level, size
 * - GET /api/ps → size_vram (VRAM alocada pelo modelo em execução)
 */
export class OllamaModelInfoProvider implements ModelInfoProvider {
  constructor(
    private model: string,
    private baseUrl: string,
  ) {}

  async getModelDetails(): Promise<Partial<ModelDetails> | null> {
    try {
      const [showData, psData] = await Promise.all([
        this.fetchShow(),
        this.fetchPs(),
      ]);

      if (!showData) return null;

      const details = showData.details ?? {};
      const modelInfo = showData.model_info ?? {};

      // Tenta extrair contextLength de model_info (varia entre modelos)
      let contextLength: number | undefined;
      for (const [key, val] of Object.entries(modelInfo)) {
        if (key.includes('context_length') && typeof val === 'number') {
          contextLength = val;
          break;
        }
      }

      // VRAM alocada pelo modelo em execução
      let vramAllocated: number | undefined;
      if (psData?.models) {
        const running = psData.models.find(
          (m: any) => m.name === this.model || m.name?.startsWith(this.model + ':'),
        );
        if (running?.size_vram) {
          vramAllocated = running.size_vram;
        }
      }

      return {
        family: details.family,
        parameterSize: details.parameter_size,
        quantization: details.quantization_level,
        sizeBytes: showData.size,
        contextLength,
        vramAllocated,
      };
    } catch (err) {
      console.error('Erro ao buscar metadados do Ollama:', err);
      return null;
    }
  }

  private async fetchShow(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: this.model }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  private async fetchPs(): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/ps`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
