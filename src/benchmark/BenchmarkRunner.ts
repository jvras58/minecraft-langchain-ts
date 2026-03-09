import { LLMProvider, ChatMessage } from '../types/types';
import { SessionManager } from '../core/SessionManager';
import { MetricsBatcher } from '../metrics/MetricsBatcher';
import { WarmupRunner } from './WarmupRunner';
import { safeParseJSON } from '../utils/jsonParser';
import { botActionSchema } from '../schemas/botAction';
import { botPromptTemplate } from '../prompts/botPrompts';
import scenarios from './scenarios.json';

export interface BenchmarkScenario {
  id: string;
  name: string;
  context: string;
  memory: string;
  expectedActions: string[];
}

interface BenchmarkResult {
  scenarioId: string;
  repetition: number;
  action: string | null;
  matchesExpected: boolean;
  parseStatus: 'valid' | 'repaired' | 'failed';
  responseTimeMs: number;
}

/**
 * Executa cenários fixos de benchmark sem servidor Minecraft.
 * Cada cenário é enviado N vezes ao modelo, e as respostas são registradas como métricas.
 */
export class BenchmarkRunner {
  private scenarios: BenchmarkScenario[];

  constructor(
    private provider: LLMProvider,
    private sessionManager: SessionManager,
    private batcher: MetricsBatcher,
    private userBotId: string,
    private config: {
      repetitionsPerScenario: number;
      warmupRounds: number;
    },
  ) {
    this.scenarios = scenarios as BenchmarkScenario[];
  }

  async run(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // 1. Warm-up
    await new WarmupRunner(this.provider, this.config.warmupRounds).run();

    // 2. Criar sessão de benchmark
    const sessionId = await this.sessionManager.startSession({
      provider: this.provider.providerName,
      model: this.provider.modelName,
      userBotId: this.userBotId,
      mode: 'benchmark',
      notes: `${this.scenarios.length} cenários x ${this.config.repetitionsPerScenario} repetições`,
    });

    console.log(`\n🎯 Benchmark: ${this.scenarios.length} cenários x ${this.config.repetitionsPerScenario} reps\n`);

    // 3. Executar cenários
    for (const scenario of this.scenarios) {
      console.log(`📝 Cenário: ${scenario.name}`);

      for (let rep = 0; rep < this.config.repetitionsPerScenario; rep++) {
        const result = await this.runSingle(scenario, rep, sessionId);
        results.push(result);

        const icon = result.matchesExpected ? '✅' : '❌';
        const statusIcon = result.parseStatus === 'valid' ? '' : ` [${result.parseStatus}]`;
        console.log(`   Rep ${rep + 1}: ${result.action ?? 'PARSE_FAILED'} ${icon}${statusIcon} (${result.responseTimeMs.toFixed(0)}ms)`);
      }
    }

    // 4. Finalizar sessão
    await this.sessionManager.endSession();

    // 5. Resumo
    this.printSummary(results);

    return results;
  }

  private async runSingle(
    scenario: BenchmarkScenario,
    repetition: number,
    sessionId: string,
  ): Promise<BenchmarkResult> {
    const humanMsg = botPromptTemplate.human
      .replace('{contexto}', scenario.context)
      .replace('{memoria}', scenario.memory)
      .replace('{contadorAcoes}', '{}');

    const messages: ChatMessage[] = [
      { role: 'system', content: botPromptTemplate.system },
      { role: 'user', content: humanMsg },
    ];

    const response = await this.provider.invoke(messages, {
      userBotId: this.userBotId,
      sessionId,
      taskName: `benchmark_${scenario.id}`,
    });

    const { data, error, status } = safeParseJSON(response.content);

    // Registrar evento de parse
    this.batcher.pushParseEvent({
      sessionId,
      status,
      rawResponse: response.content.slice(0, 2000),
      errorMessage: error ?? undefined,
    });

    this.sessionManager.incrementCounter(status);

    let action: string | null = null;
    let matchesExpected = false;

    if (data && !error) {
      try {
        const parsed = botActionSchema.parse(data);
        action = parsed.acao;
        matchesExpected = scenario.expectedActions.includes(action);
      } catch {
        // Schema validation failed
      }
    }

    return {
      scenarioId: scenario.id,
      repetition,
      action,
      matchesExpected,
      parseStatus: status,
      responseTimeMs: response.responseTimeMs,
    };
  }

  private printSummary(results: BenchmarkResult[]): void {
    const total = results.length;
    const matched = results.filter((r) => r.matchesExpected).length;
    const validJson = results.filter((r) => r.parseStatus === 'valid').length;
    const repairedJson = results.filter((r) => r.parseStatus === 'repaired').length;
    const failedJson = results.filter((r) => r.parseStatus === 'failed').length;
    const avgTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / total;

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 RESUMO DO BENCHMARK');
    console.log('═══════════════════════════════════════════');
    console.log(`   Modelo: ${this.provider.providerName} / ${this.provider.modelName}`);
    console.log(`   Total de execuções: ${total}`);
    console.log(`   Ações corretas: ${matched}/${total} (${((matched / total) * 100).toFixed(1)}%)`);
    console.log(`   JSON válido: ${validJson} | reparado: ${repairedJson} | falho: ${failedJson}`);
    console.log(`   Tempo médio de resposta: ${avgTime.toFixed(0)}ms`);
    console.log('═══════════════════════════════════════════\n');
  }
}
