import { LLMProvider } from '../types';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract invoke(variables: Record<string, any>): Promise<string>;
}