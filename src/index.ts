import 'dotenv/config';

import { createLLMProvider, createModelInfoProvider } from './providers/ProviderFactory';
import { botConfig } from './config/settings';
import { BotManager } from './bot/BotManager';
import { AgentLoop } from './core/AgentLoop';
import { MetricsBatcher } from './metrics/MetricsBatcher';
import { sleep } from './utils/sleep';

async function main(): Promise<void> {
  console.log('🤖 Iniciando Bot de Minecraft com IA...\n');

  const provider = createLLMProvider();
  const modelInfoProvider = createModelInfoProvider();
  const botManager = new BotManager(botConfig);
  const agent = new AgentLoop(botManager, provider, modelInfoProvider);

  const shutdown = async () => {
    console.log('\n🛑 Encerrando...');
    await agent.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await botManager.createBot();
  await sleep(2000);

  await agent.start();
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  MetricsBatcher.getInstance().flush().finally(() => process.exit(1));
});
