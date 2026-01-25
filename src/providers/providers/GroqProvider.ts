import { ChatGroq } from '@langchain/groq';
import { BaseLLMProvider } from '../LLMProvider';
import { PromptTemplate } from '../../types/types';
import { MetricsCallbackHandler } from '../../utils/MetricsCallbackHandler';

export class GroqProvider extends BaseLLMProvider {
  private llm: ChatGroq;
  private promptTemplate: PromptTemplate;
  private modelName = 'llama-3.3-70b-versatile';

  constructor(apiKey: string, promptTemplate: PromptTemplate) {
    super();
    this.llm = new ChatGroq({
      apiKey,
      model: this.modelName,
      temperature: 0.8,
    });
    this.promptTemplate = promptTemplate;
  }

  async invoke(
    variables: Record<string, any>,
    userBotId: string,
    taskName?: string
  ): Promise<string> {
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
      provider: 'Groq',
      model: this.modelName,
      userBotId,
      taskName,
    });

    const result = await this.llm.invoke(messages, {
      callbacks: [metricsCallback],
    });

    return result.content as string;
  }
}