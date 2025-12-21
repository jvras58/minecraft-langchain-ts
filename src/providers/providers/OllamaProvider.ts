import { ChatOllama } from '@langchain/ollama';
import { BaseLLMProvider } from '../LLMProvider';
import { PromptTemplate } from '../../types/types';
import { MetricsCallbackHandler } from '../../utils/MetricsCallbackHandler';

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

  async invoke(variables: Record<string, any>, userBotId: string): Promise<string> {
    const humanMessage = this.promptTemplate.human
      .replace('{contexto}', variables.contexto || '')
      .replace('{ultimaAcao}', variables.ultimaAcao || '')
      .replace('{contadorAcoes}', variables.contadorAcoes || '');

    const messages = [
      { role: 'system', content: this.promptTemplate.system },
      { role: 'user', content: humanMessage }
    ];

    // Callback para métricas automáticas
    const metricsCallback = new MetricsCallbackHandler({
      provider: 'Ollama',
      model: this.modelName,
      userBotId,
    });

    const result = await this.llm.invoke(messages, {
      callbacks: [metricsCallback],
    });

    return result.content as string;
  }
}