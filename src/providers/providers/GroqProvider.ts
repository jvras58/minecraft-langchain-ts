import { ChatGroq } from '@langchain/groq';
import { BaseLLMProvider } from '../BaseLLMProvider';
import { ChatMessage, InvokeOptions } from '../../types/types';

export class GroqProvider extends BaseLLMProvider {
  readonly providerName = 'Groq';
  readonly modelName: string;
  private llm: ChatGroq;

  constructor(apiKey: string, model?: string) {
    super();
    this.modelName = model || 'llama-3.3-70b-versatile';
    this.llm = new ChatGroq({
      apiKey,
      model: this.modelName,
      temperature: 0.8,
    });
  }

  protected async callModel(
    messages: ChatMessage[],
    _options?: InvokeOptions,
  ) {
    const result = await this.llm.invoke(
      messages.map((m) => ({ role: m.role as any, content: m.content })),
    );

    // Extrai tokens do response_metadata (Groq fornece via API)
    const meta = (result as any).response_metadata;
    const usage =
      meta?.token_usage ?? meta?.tokenUsage ?? meta?.usage ?? {};

    return {
      content: result.content as string,
      inputTokens:
        usage.prompt_tokens ?? usage.promptTokens ?? usage.input_tokens,
      outputTokens:
        usage.completion_tokens ??
        usage.completionTokens ??
        usage.output_tokens,
    };
  }
}