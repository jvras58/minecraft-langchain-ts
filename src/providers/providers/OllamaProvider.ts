import { ChatOllama } from '@langchain/ollama';
import { BaseLLMProvider } from '../BaseLLMProvider';
import { ChatMessage, InvokeOptions } from '../../types/types';

export class OllamaProvider extends BaseLLMProvider {
  readonly providerName = 'Ollama';
  readonly modelName: string;
  private llm: ChatOllama;

  constructor(model: string, baseUrl?: string) {
    super();
    this.modelName = model;
    this.llm = new ChatOllama({
      model,
      temperature: 0.8,
      baseUrl: baseUrl || 'http://localhost:11434',
    });
  }

  protected async callModel(
    messages: ChatMessage[],
    _options?: InvokeOptions,
  ) {
    const result = await this.llm.invoke(
      messages.map((m) => ({ role: m.role as any, content: m.content })),
    );

    // Ollama pode colocar tokens em response_metadata ou llmOutput
    const meta = (result as any).response_metadata ?? {};
    const inputTokens =
      meta.prompt_eval_count ?? meta.prompt_tokens ?? meta.input_tokens;
    const outputTokens =
      meta.eval_count ?? meta.completion_tokens ?? meta.output_tokens;

    return {
      content: result.content as string,
      inputTokens,
      outputTokens,
    };
  }
}