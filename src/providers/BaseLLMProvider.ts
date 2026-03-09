import {
  ChatMessage,
  InvokeOptions,
  LLMProvider,
  LLMResponse,
} from '../types/types';
import { MetricsBatcher } from '../metrics/MetricsBatcher';

/**
 * Classe base para provedores de LLM.
 *
 * Responsabilidades:
 * - Medir tempo de resposta automaticamente
 * - Enfileirar métricas via MetricsBatcher (sem I/O síncrono)
 * - Fornecer interface uniforme para qualquer provider
 *
 * Para adicionar um novo provider:
 * 1. Crie uma classe que estenda BaseLLMProvider
 * 2. Implemente callModel() com a chamada ao SDK
 * 3. Registre em ProviderFactory.ts
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly providerName: string;
  abstract readonly modelName: string;

  /** Implementado por cada provider - faz a chamada real ao modelo. */
  protected abstract callModel(
    messages: ChatMessage[],
    options?: InvokeOptions,
  ): Promise<{ content: string; inputTokens?: number; outputTokens?: number }>;

  /** Interface pública - mede tempo e enfileira métricas automaticamente. */
  async invoke(
    messages: ChatMessage[],
    options?: InvokeOptions,
  ): Promise<LLMResponse> {
    const start = performance.now();

    const result = await this.callModel(messages, options);

    const responseTimeMs = performance.now() - start;

    // Enfileira métrica sem bloquear (fire-and-forget)
    if (options?.userBotId) {
      MetricsBatcher.getInstance()
        .pushLLMMetric({
          provider: this.providerName,
          model: this.modelName,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          responseTimeMs,
          userBotId: options.userBotId,
          taskName: options.taskName,
        })
        .catch((err) => console.error('Erro ao enfileirar métrica LLM:', err));
    }

    return {
      content: result.content,
      tokenUsage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
      responseTimeMs,
    };
  }
}