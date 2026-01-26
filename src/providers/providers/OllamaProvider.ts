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

  async invoke(
    variables: Record<string, any>,
    userBotId: string,
    taskName?: string
  ): Promise<string> {
    const contexto = variables.contexto || '';
    const contextoComInstrucao = `${contexto}\n\nInstrução: Retorne apenas um objeto JSON válido com as chaves necessárias, sem texto extra. Exemplo: {"acao": "EXPLORAR"}.`;

    const humanMessage = this.promptTemplate.human
      .replace('{contexto}', contextoComInstrucao)
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
      taskName,
    });

    const result = await this.llm.invoke(messages, {
      callbacks: [metricsCallback],
    });

    return result.content as string;
  }
}