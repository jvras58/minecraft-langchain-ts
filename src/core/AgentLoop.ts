import { BotAction, LLMProvider, ChatMessage, ModelInfoProvider } from '../types/types';
import { BotManager } from '../bot/BotManager';
import { ActionExecutor } from '../bot/ActionExecutor';
import { PerceptionManager } from '../bot/PerceptionManager';
import { MemoryManager } from '../core/MemoryManager';
import { SessionManager } from '../core/SessionManager';
import { botActionSchema } from '../schemas/botAction';
import { botPromptTemplate } from '../prompts/botPrompts';
import { MetricsBatcher } from '../metrics/MetricsBatcher';
import { sleep } from '../utils/sleep';
import { safeParseJSON } from '../utils/jsonParser';
import { agentConfig } from '../config/settings';

/**
 * Loop principal do agente: Percepção → Memória → Raciocínio → Ação → Registro.
 *
 * Inclui:
 * - SessionManager para rastrear sessões de experimento
 * - Registro de eventos de parse JSON (válido/reparado/falho)
 * - Registro de eventos de conexão
 * - Propagação de sessionId para todas as métricas
 */
export class AgentLoop {
  private botManager: BotManager;
  private provider: LLMProvider;
  private executor: ActionExecutor | null = null;
  private perception: PerceptionManager | null = null;
  private memory: MemoryManager;
  private batcher: MetricsBatcher;
  private sessionManager: SessionManager;
  private isRunning = false;
  private listenersAttached = false;
  private modelInfoProvider?: ModelInfoProvider;

  constructor(
    botManager: BotManager,
    provider: LLMProvider,
    modelInfoProvider?: ModelInfoProvider,
  ) {
    this.botManager = botManager;
    this.provider = provider;
    this.modelInfoProvider = modelInfoProvider;
    this.memory = new MemoryManager();
    this.batcher = MetricsBatcher.getInstance();
    this.sessionManager = new SessionManager();

    this.botManager.setCallbacks(
      () => this.onConnected(),
      () => this.onDisconnected(),
    );
  }

  async start(): Promise<void> {
    console.log('🧠 Agente ativado');
    console.log(`   Provider: ${this.provider.providerName} (${this.provider.modelName})`);
    this.isRunning = true;
    this.batcher.start();

    // Aguarda userBotId estar disponível antes de criar sessão
    await this.waitForUserBotId();

    if (this.botManager.userBotId) {
      await this.sessionManager.startSession({
        provider: this.provider.providerName,
        model: this.provider.modelName,
        userBotId: this.botManager.userBotId,
        mode: 'gameplay',
        notes: process.env.SESSION_NOTES,
        modelInfoProvider: this.modelInfoProvider,
      });
    }

    this.loop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.sessionManager.endSession();
    await this.batcher.shutdown();
  }

  private async waitForUserBotId(): Promise<void> {
    let attempts = 0;
    while (!this.botManager.userBotId && attempts < 30) {
      await sleep(500);
      attempts++;
    }
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
          sessionId: this.sessionManager.getSessionId() ?? undefined,
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

      const sessionId = this.sessionManager.getSessionId() ?? undefined;

      const response = await this.provider.invoke(messages, {
        userBotId: this.botManager.userBotId,
        sessionId,
        taskName: 'action_decision',
      });

      const { data, error, repaired, status } = safeParseJSON(response.content);

      // Registrar evento de parse no banco
      this.batcher.pushParseEvent({
        sessionId,
        status,
        rawResponse: response.content.slice(0, 2000),
        errorMessage: error ?? undefined,
      });

      // Atualizar contadores da sessão
      this.sessionManager.incrementCounter(status);

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

    // Registrar evento de conexão
    this.batcher.pushConnectionEvent({
      sessionId: this.sessionManager.getSessionId() ?? undefined,
      eventType: 'connected',
    });

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
        this.batcher.pushConnectionEvent({
          sessionId: this.sessionManager.getSessionId() ?? undefined,
          eventType: 'death',
        });
        this.sessionManager.incrementCounter('disconnect');
      });
    } else {
      this.memory.recordEvent('Respawnei');
      this.batcher.pushConnectionEvent({
        sessionId: this.sessionManager.getSessionId() ?? undefined,
        eventType: 'reconnected',
      });
      this.sessionManager.incrementCounter('reconnect');
    }
  }

  private onDisconnected(): void {
    this.executor = null;
    this.perception = null;
    this.listenersAttached = false;

    this.batcher.pushConnectionEvent({
      sessionId: this.sessionManager.getSessionId() ?? undefined,
      eventType: 'disconnected',
    });
    this.sessionManager.incrementCounter('disconnect');
  }
}
