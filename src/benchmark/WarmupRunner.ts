import { LLMProvider, ChatMessage } from '../types/types';

/**
 * Executa rodadas de warm-up para eliminar cold start do dataset.
 * Métricas não são salvas (não passa userBotId).
 */
export class WarmupRunner {
  constructor(
    private provider: LLMProvider,
    private rounds: number = 3,
  ) {}

  async run(): Promise<void> {
    console.log(`🔥 Warm-up: ${this.rounds} rodadas (métricas descartadas)`);
    const warmupPrompt = 'Responda apenas: {"acao":"NADA","raciocinio":"warmup"}';

    for (let i = 0; i < this.rounds; i++) {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'Responda apenas JSON.' },
        { role: 'user', content: warmupPrompt },
      ];

      await this.provider.invoke(messages);
      // Sem userBotId → métrica não é salva
      console.log(`   Warm-up ${i + 1}/${this.rounds} ✓`);
    }

    console.log('🔥 Warm-up concluído');
  }
}
