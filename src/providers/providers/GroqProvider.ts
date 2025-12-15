import { ChatGroq } from '@langchain/groq';
import { BaseLLMProvider } from '../LLMProvider';
import { PromptTemplate } from '../../types/types';

export class GroqProvider extends BaseLLMProvider {
  private llm: ChatGroq;
  private promptTemplate: PromptTemplate;

  constructor(apiKey: string, promptTemplate: PromptTemplate) {
    super();
    this.llm = new ChatGroq({
      apiKey,
      model: 'llama-3.3-70b-versatile',
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

    const result = await this.llm.invoke(messages);
    return result.content as string;
  }
}