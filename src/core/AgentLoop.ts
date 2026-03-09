import { BotAction, LLMProvider, ChatMessage } from '../types/types';
import { BotManager } from '../bot/BotManager';
import { ActionExecutor } from '../bot/ActionExecutor';
import { PerceptionManager } from '../bot/PerceptionManager';
import { MemoryManager } from '../core/MemoryManager';
import { botActionSchema } from '../schemas/botAction';
import { botPromptTemplate } from '../prompts/botPrompts';
import { MetricsBatcher } from '../metrics/MetricsBatcher';
import { sleep } from '../utils/sleep';
import { safeParseJSON } from '../utils/jsonParser';
import { agentConfig } from '../config/settings';

/**
 * Loop principal do agente: Percepção → Memória → Raciocínio → Ação → Registro.
 *
 * Diferenças da versão anterior:
 * - MemoryManager dá contexto temporal (o bot sabe o que fez recentemente)
 * - Prompts com chain-of-thought (campo "raciocinio")
 * - Métricas via batcher (sem I/O a cada ciclo)
 * - Provider genérico — não depende de prompt template interno
 */
export class AgentLoop {
  private botManager: BotManager;
  private provider: LLMProvider;
  private executor: ActionExecutor | null = null;
  private perception: PerceptionManager | null = null;
  private memory: MemoryManager;
  private batcher: MetricsBatcher;
  private isRunning = false;
  private listenersAttached = false;

  constructor(botManager: BotManager, provider: LLMProvider) {
    this.botManager = botManager;
    this.provider = provider;
    this.memory = new MemoryManager();
    this.batcher = MetricsBatcher.getInstance();

    this.botManager.setCallbacks(
      () => this.onConnected(),
      () => this.onDisconnected(),
    );
  }

  start(): void {
    console.log('🧠 Agente ativado');
    console.log(`   Provider: ${this.provider.providerName} (${this.provider.modelName})`);
    this.isRunning = true;
    this.batcher.start();
    this.loop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.batcher.shutdown();
  }

  private async loop(): Promise<void> {
    while (this.isRunning) {
      if (!this.botManager.isConnected() || !this.executor || !this.perception || !this.botManager.userBotId) {
        await sleep(agentConfig.disconnectedWaitMs);
        continue;
      }

      try {
        // 1. PERCEPÇÃO
        const contexto = this.perception.getContextString();

        // 2. RACIOCÍNIO (LLM)
        const decisao = await this.pensar(contexto);
        if (!decisao || !this.botManager.isConnected()) continue;

        // Log do raciocínio
        if (decisao.raciocinio) {
          console.log(`💭 Raciocínio: ${decisao.raciocinio}`);
        }

        // 3. AÇÃO
        const result = await this.executor.executar(decisao);

        // 4. MEMÓRIA
        this.memory.recordAction(
          result.action,
          result.success,
          result.direction || result.content || undefined,
        );

        // 5. MÉTRICA DE AÇÃO (enfileirada, sem I/O)
        this.batcher.pushActionMetric({
          userBotId: this.botManager.userBotId,
          action: result.action,
          direction: result.direction,
          content: result.content,
          success: result.success,
          errorMessage: result.errorMessage,
          executionTimeMs: result.executionTimeMs,
        });

        if (!result.success) {
          console.log(`⚠️  ${result.action} falhou: ${result.errorMessage}`);
        }

        await sleep(agentConfig.loopIntervalMs);
      } catch (err) {
        console.error('❌ Erro no loop:', err);
        await sleep(5000);
      }
    }
  }

  private async pensar(contexto: string): Promise<BotAction | null> {
    if (!this.botManager.isConnected() || !this.botManager.userBotId) return null;

    try {
      const humanMsg = botPromptTemplate.human
        .replace('{contexto}', contexto)
        .replace('{memoria}', this.memory.toPromptString())
        .replace('{contadorAcoes}', JSON.stringify(this.memory.getActionCounts()));

      const messages: ChatMessage[] = [
        { role: 'system', content: botPromptTemplate.system },
        { role: 'user', content: humanMsg },
      ];

      const response = await this.provider.invoke(messages, {
        userBotId: this.botManager.userBotId,
        taskName: 'action_decision',
      });

      const { data, error, repaired } = safeParseJSON(response.content);

      if (!data || error) {
        console.warn(`⚠️  JSON inválido da LLM: ${error}`);
        console.warn(`   Resposta bruta: ${response.content.slice(0, 200)}`);
        this.memory.recordEvent('LLM retornou JSON inválido — fallback');
        return { raciocinio: 'Fallback: JSON inválido', acao: 'EXPLORAR' };
      }

      if (repaired) {
        console.log('🔧 JSON da LLM precisou de reparo (jsonrepair)');
      }

      return botActionSchema.parse(data);
    } catch (err) {
      console.error('❌ Erro no raciocínio:', err);
      this.memory.recordEvent('Erro no raciocínio — explorando por fallback');
      return { raciocinio: 'Fallback por erro', acao: 'EXPLORAR' };
    }
  }

  private onConnected(): void {
    const bot = this.botManager.getBot();
    if (!bot) return;

    this.executor = new ActionExecutor(bot);
    this.perception = new PerceptionManager(bot);

    if (!this.listenersAttached) {
      this.listenersAttached = true;
      this.memory.clear();
      this.memory.recordEvent('Conectado ao servidor');

      bot.on('chat', (user, msg) => {
        if (user === bot.username) return;
        this.memory.recordInteraction(user, msg);
      });

      bot.on('health', () => {
        if (bot.health < 8) {
          this.memory.recordEvent(`Vida baixa: ${bot.health.toFixed(0)}/20`);
        }
      });

      bot.on('death', () => {
        this.memory.recordEvent('Morri! Respawnando...');
      });
    } else {
      this.memory.recordEvent('Respawnei');
    }
  }

  private onDisconnected(): void {
    this.executor = null;
    this.perception = null;
    this.listenersAttached = false;
  }
}