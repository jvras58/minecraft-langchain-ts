import { LLMProvider } from '../types/types';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract invoke(variables: Record<string, any>, userBotId: string, taskName?: string): Promise<string>;
}