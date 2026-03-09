import {
  ChatMessage,
  InvokeOptions,
  LLMProvider,
  LLMResponse,
} from '../types/types';
import { MetricsBatcher } from '../metrics/MetricsBatcher';
import { HardwareMonitor } from '../metrics/HardwareMonitor';
import { countTokens, countMessagesTokens } from '../utils/tokenCounter';

/**
 * Classe base para provedores de LLM.
 *
 * Responsabilidades:
 * - Medir tempo de resposta automaticamente
 * - Contar tokens localmente (consistente entre providers)
 * - Capturar hardware antes/depois da inferência
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
    // Contagem local de tokens de entrada (independente do provider)
    const localInputTokens = countMessagesTokens(messages);

    // Snapshot de hardware antes da inferência
    const hardwareBefore = await HardwareMonitor.getInstance().getDynamicSnapshot();

    const start = performance.now();
    const result = await this.callModel(messages, options);
    const responseTimeMs = performance.now() - start;

    // Snapshot de hardware depois da inferência
    const hardwareAfter = await HardwareMonitor.getInstance().getDynamicSnapshot();

    // Contagem local de tokens de saída
    const localOutputTokens = countTokens(result.content);

    // Tokens por segundo (baseado na contagem local)
    const tokensPerSecond = responseTimeMs > 0
      ? localOutputTokens / (responseTimeMs / 1000)
      : undefined;

    const totalTokens = localInputTokens + localOutputTokens;

    // Enfileira métrica sem bloquear (fire-and-forget)
    if (options?.userBotId) {
      MetricsBatcher.getInstance()
        .pushLLMMetric({
          provider: this.providerName,
          model: this.modelName,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          localInputTokens,
          localOutputTokens,
          tokensPerSecond,
          totalTokens,
          responseTimeMs,
          userBotId: options.userBotId,
          sessionId: options.sessionId,
          taskName: options.taskName,
          hardwareBefore,
          hardwareAfter,
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
