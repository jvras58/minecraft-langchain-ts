import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { Serialized } from '@langchain/core/load/serializable';
import { LLMResult } from '@langchain/core/outputs';
import { collectAndStoreMetric } from './metrics';

export interface MetricsCallbackConfig {
    provider: string;
    model: string;
    userBotId: string;
}

interface TokenUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}

/**
 * Callback handler que captura métricas do LangChain e salva no Prisma.
 * Suporta múltiplos providers (Ollama, Groq, OpenAI, etc.) com extração híbrida.
 * 
 * Prioridade de extração de tokens:
 * 1. response_metadata (mais confiável para ChatModels)
 * 2. llmOutput (fallback para alguns providers)
 * 3. Estimativa baseada em caracteres (último recurso)
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

        // Extrai tokens usando abordagem híbrida
        const tokenUsage = this.extractTokenUsage(output);

        // Fallback: estima tokens se não conseguiu extrair
        if (!tokenUsage.outputTokens) {
            const generations = output.generations?.[0]?.[0];
            if (generations) {
                const text = typeof generations.text === 'string' ? generations.text : '';
                tokenUsage.outputTokens = Math.ceil(text.length / 4);
            }
        }

        await collectAndStoreMetric({
            provider: this.config.provider,
            model: this.config.model,
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
            responseTime,
            userBotId: this.config.userBotId,
        });
    }

    /**
     * Extrai token usage de múltiplas fontes possíveis.
     * Funciona com Groq, Ollama, OpenAI e outros providers.
     */
    private extractTokenUsage(output: LLMResult): TokenUsage {
        // Fonte 1: response_metadata das gerações (ChatModels)
        const generation = output.generations?.[0]?.[0];
        const responseMetadata = (generation as any)?.message?.response_metadata;

        if (responseMetadata) {
            const usage = responseMetadata.token_usage ||
                responseMetadata.tokenUsage ||
                responseMetadata.usage;
            if (usage) {
                return this.normalizeTokenUsage(usage);
            }
        }

        // Fonte 2: llmOutput (alguns providers colocam aqui)
        const llmOutput = output.llmOutput;
        if (llmOutput) {
            const usage = llmOutput.tokenUsage ||
                llmOutput.token_usage ||
                llmOutput.usage;
            if (usage) {
                return this.normalizeTokenUsage(usage);
            }
        }

        // Fonte 3: Ollama específico (pode ter formato diferente)
        if (llmOutput?.model) {
            // Ollama retorna no formato: { prompt_eval_count, eval_count }
            const promptTokens = llmOutput.prompt_eval_count;
            const completionTokens = llmOutput.eval_count;
            if (promptTokens !== undefined || completionTokens !== undefined) {
                return {
                    inputTokens: promptTokens,
                    outputTokens: completionTokens,
                };
            }
        }

        return {};
    }

    /**
     * Normaliza diferentes formatos de token usage para um formato comum.
     */
    private normalizeTokenUsage(usage: any): TokenUsage {
        return {
            inputTokens: usage.prompt_tokens ??
                usage.promptTokens ??
                usage.input_tokens ??
                usage.prompt_eval_count,
            outputTokens: usage.completion_tokens ??
                usage.completionTokens ??
                usage.output_tokens ??
                usage.eval_count,
            totalTokens: usage.total_tokens ??
                usage.totalTokens,
        };
    }

    async handleLLMError(err: Error, _runId: string): Promise<void> {
        console.error(`[MetricsCallbackHandler] LLM Error: ${err.message}`);
    }
}

