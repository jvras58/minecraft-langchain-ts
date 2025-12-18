import { ChatOllama } from '@langchain/ollama';
import { BaseLLMProvider } from '../LLMProvider';
import { PromptTemplate } from '../../types/types';
import { collectAndStoreMetric } from '../../utils/metrics';
import perf from 'performance-now';

export class OllamaProvider extends BaseLLMProvider {
  private llm: ChatOllama;
  private promptTemplate: PromptTemplate;
  private modelName: string;

  constructor(modelName: string, promptTemplate: PromptTemplate) {
    super();
    this.modelName = modelName;
    this.llm = new ChatOllama({
      model: modelName,
      temperature: 0.8,
    });
    this.promptTemplate = promptTemplate;
  }

  async invoke(variables: Record<string, any>): Promise<string> {
    const humanMessage = this.promptTemplate.human
      .replace('{contexto}', variables.contexto || '')
      .replace('{ultimaAcao}', variables.ultimaAcao || '')
      .replace('{contadorAcoes}', variables.contadorAcoes || '');

    const messages = [
      { role: 'system', content: this.promptTemplate.system },
      { role: 'user', content: humanMessage }
    ];

    const start = perf();
    const result = await this.llm.invoke(messages);
    const end = perf();
    const responseTime = (end - start) / 1000; // em segundos

    // Estimar tokens (simples estimativa: 1 token ~ 4 caracteres)
    const inputText = this.promptTemplate.system + humanMessage;
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.ceil((result.content as string).length / 4);

    await collectAndStoreMetric({
      provider: 'Ollama',
      model: this.modelName,
      inputTokens,
      outputTokens,
      responseTime,
    });

    return result.content as string;
  }
}