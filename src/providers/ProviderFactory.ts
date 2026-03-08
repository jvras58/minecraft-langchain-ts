import { LLMProvider } from '../types/types';
import { GroqProvider } from './providers/GroqProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { llmConfig } from '../config/settings';

/**
 * Cria o provider baseado na configuração.
 *
 * Para adicionar um novo provider:
 * 1. Crie a classe em providers/providers/NomeProvider.ts
 * 2. Adicione o case aqui
 * 3. Adicione a config em settings.ts e .env
 */
export function createLLMProvider(): LLMProvider {
  const provider = llmConfig.provider;

  switch (provider) {
    case 'groq':
      if (!llmConfig.groq.apiKey) {
        throw new Error('GROQ_API_KEY não configurada no .env');
      }
      return new GroqProvider(llmConfig.groq.apiKey, llmConfig.groq.model);

    case 'ollama':
      return new OllamaProvider(
        llmConfig.ollama.model,
        llmConfig.ollama.baseUrl,
      );

    default:
      throw new Error(
        `Provider "${provider}" não suportado. ` +
          `Opções: groq, ollama. Configure LLM_PROVIDER no .env`,
      );
  }
}