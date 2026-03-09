import 'dotenv/config';

import { createLLMProvider, createModelInfoProvider } from '../providers/ProviderFactory';
import { SessionManager } from '../core/SessionManager';
import { MetricsBatcher } from '../metrics/MetricsBatcher';
import { BenchmarkRunner } from './BenchmarkRunner';
import { getOrCreateUserBot } from '../utils/userBot';
import { benchmarkConfig, botConfig } from '../config/settings';

async function main(): Promise<void> {
  console.log('🎯 Modo Benchmark — execução sem servidor Minecraft\n');

  // Parse CLI args
  const args = process.argv.slice(2);
  const reps = getArg(args, '--reps', benchmarkConfig.repetitionsPerScenario);
  const warmup = getArg(args, '--warmup', benchmarkConfig.warmupRounds);

  const provider = createLLMProvider();
  const batcher = MetricsBatcher.getInstance();
  const sessionManager = new SessionManager();

  batcher.start();

  const userBotId = await getOrCreateUserBot(botConfig.username);

  const runner = new BenchmarkRunner(provider, sessionManager, batcher, userBotId, {
    repetitionsPerScenario: reps,
    warmupRounds: warmup,
  });

  try {
    await runner.run();
  } finally {
    await batcher.shutdown();
  }
}

function getArg(args: string[], flag: string, defaultValue: number): number {
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) {
    const val = parseInt(args[idx + 1]);
    return isNaN(val) ? defaultValue : val;
  }
  return defaultValue;
}

main().catch((err) => {
  console.error('❌ Erro no benchmark:', err);
  MetricsBatcher.getInstance().flush().finally(() => process.exit(1));
});
