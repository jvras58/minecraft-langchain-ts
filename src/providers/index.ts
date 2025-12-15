import { BaseLLMProvider } from './LLMProvider';
import { GroqProvider } from './GroqProvider';
import { OllamaProvider } from './OllamaProvider';
import { PromptTemplate } from '../types';

export function createLLMProvider(providerType: string, config: any, promptTemplate: PromptTemplate): BaseLLMProvider {
  switch (providerType) {
    case 'groq':
      return new GroqProvider(config.apiKey, promptTemplate);
    case 'ollama':
      return new OllamaProvider(config.modelName, promptTemplate);
    default:
      throw new Error(`Provider ${providerType} not supported`);
  }
}