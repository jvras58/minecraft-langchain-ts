import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { collectAndStoreMetric } from './metrics';

export interface MetricsCallbackConfig {
    provider: string;
    model: string;
    userBotId: string;
}

/**
 * Callback handler que captura métricas do LangChain e salva no Prisma.
 * Funciona em conjunto com LangSmith para ter dados locais + dashboard remoto.
 */
export class MetricsCallbackHandler extends BaseCallbackHandler {
    name = 'MetricsCallbackHandler';
    private config: MetricsCallbackConfig;
    private startTime: number = 0;

    constructor(config: MetricsCallbackConfig) {
        super();
        this.config = config;
    }

    async handleLLMStart(
        _llm: Serialized,
        _prompts: string[],
        _runId: string,
    ): Promise<void> {
        this.startTime = performance.now();
    }

    async handleLLMEnd(output: LLMResult, _runId: string): Promise<void> {
        const endTime = performance.now();
        const responseTime = (endTime - this.startTime) / 1000; // em segundos

        // Tenta pegar token usage real do LLM output
        const tokenUsage = output.llmOutput?.tokenUsage ||
            output.llmOutput?.usage ||
            output.llmOutput?.token_usage;

        let inputTokens: number | undefined;
        let outputTokens: number | undefined;

        if (tokenUsage) {
            // Diferentes providers usam diferentes nomes
            inputTokens = tokenUsage.promptTokens ||
                tokenUsage.prompt_tokens ||
                tokenUsage.input_tokens;
            outputTokens = tokenUsage.completionTokens ||
                tokenUsage.completion_tokens ||
                tokenUsage.output_tokens;
        }

        // Se não conseguiu pegar tokens reais, estima (fallback)
        if (!inputTokens || !outputTokens) {
            const generations = output.generations?.[0]?.[0];
            if (generations) {
                const text = typeof generations.text === 'string' ? generations.text : '';
                // Estimativa: 1 token ≈ 4 caracteres
                outputTokens = outputTokens || Math.ceil(text.length / 4);
            }
        }

        await collectAndStoreMetric({
            provider: this.config.provider,
            model: this.config.model,
            inputTokens,
            outputTokens,
            responseTime,
            userBotId: this.config.userBotId,
        });
    }

    async handleLLMError(err: Error, _runId: string): Promise<void> {
        console.error(`[MetricsCallbackHandler] LLM Error: ${err.message}`);
    }
}
