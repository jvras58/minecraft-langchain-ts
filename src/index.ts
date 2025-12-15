import 'dotenv/config';

import { LLMProvider } from './types/types';
import { createLLMProvider } from './providers/CreateLLMProvider';
import { botPromptTemplate } from './prompts/botPrompts';
import { botConfig, llmConfig } from './config/settings';
import { BotManager } from './bot/BotManager';
import { GameLoop } from './core/GameLoop';
import { sleep } from './utils/sleep';

const llmProvider: LLMProvider = createLLMProvider(llmConfig.provider, llmConfig[llmConfig.provider as keyof typeof llmConfig], botPromptTemplate);
const botManager = new BotManager(botConfig);
const gameLoop = new GameLoop(botManager, llmProvider);

async function main(): Promise<void> {
  console.log('🤖 Iniciando Bot de Minecraft com IA...\n');

  botManager.createBot();

  await sleep(2000);

  gameLoop.start();
}

main().catch((erro) => {
  console.error('❌ Erro fatal:', erro);
  process.exit(1);
});