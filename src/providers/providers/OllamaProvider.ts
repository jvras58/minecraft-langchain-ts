import { ChatOllama } from '@langchain/ollama';
import { BaseLLMProvider } from '../LLMProvider';
import { PromptTemplate } from '../../types/types';

export class OllamaProvider extends BaseLLMProvider {
  private llm: ChatOllama;
  private promptTemplate: PromptTemplate;

  constructor(modelName: string, promptTemplate: PromptTemplate) {
    super();
    this.llm = new ChatOllama({
      model: modelName,
      temperature: 0.8,
    });
    this.promptTemplate = promptTemplate;
  }

  async invoke(variables: Record<string, any>): Promise<string> {
    // Construir a mensagem human com as variáveis substituídas
    const humanMessage = this.promptTemplate.human
      .replace('{contexto}', variables.contexto || '')
      .replace('{ultimaAcao}', variables.ultimaAcao || '')
      .replace('{contadorAcoes}', variables.contadorAcoes || '');

    const messages = [
      { role: 'system', content: this.promptTemplate.system },
      { role: 'user', content: humanMessage }
    ];

    const result = await this.llm.invoke(messages);
    return result.content as string;
  }
}