import { BotAction, LLMProvider } from '../types/types';
import { BotManager } from '../bot/BotManager';
import { ActionExecutor } from '../bot/ActionExecutor';
import { PerceptionManager } from '../bot/PerceptionManager';
import { botActionSchema } from '../schemas/botAction';
import { sleep } from '../utils/sleep';
import { collectActionMetric } from '../utils/metrics';

export class GameLoop {
  private botManager: BotManager;
  private llmProvider: LLMProvider;
  private actionExecutor: ActionExecutor | null = null;
  private perceptionManager: PerceptionManager | null = null;
  private ultimaAcao = 'NADA';
  private contadorAcoes = { FALAR: 0, ANDAR: 0, PULAR: 0, EXPLORAR: 0 };
  private isRunning = false;

  constructor(botManager: BotManager, llmProvider: LLMProvider) {
    this.botManager = botManager;
    this.llmProvider = llmProvider;

    this.botManager.setCallbacks(
      () => this.onBotConnected(),
      () => this.onBotDisconnected()
    );
  }

  start(): void {
    console.log('🧠 Cérebro ativado...');
    this.isRunning = true;
    this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      if (!this.botManager.isConnected() || !this.actionExecutor || !this.perceptionManager || !this.botManager.userBotId) {
        await sleep(2000);
        continue;
      }

      const userBotId = this.botManager.userBotId;

      try {
        // 1. PERCEPÇÃO
        const contexto = this.perceptionManager.getGameContext();

        // 2. PENSAMENTO
        const decisao = await this.pensar(contexto, userBotId);

        if (!this.botManager.isConnected() || !decisao) {
          continue;
        }

        // 3. AÇÃO (agora retorna ActionResult completo)
        const result = await this.actionExecutor.executarAcao(decisao);

        // 4. SALVAR MÉTRICAS DE AÇÃO
        try {
          await collectActionMetric({
            userBotId,
            action: result.action,
            direction: result.direction,
            content: result.content,
            success: result.success,
            errorMessage: result.errorMessage,
            executionTime: result.executionTime,
          });
        } catch (metricError) {
          console.error('Erro ao coletar métricas:', metricError);
          if (result.success) {
            console.warn(
              `Métrica de ação não registrada para ação bem-sucedida. ` +
              `userBotId=${userBotId}, ação=${result.action}, direção=${result.direction}`
            );
          }
        }

        if (!result.success) {
          console.log(`⚠️  Ação ${result.action} falhou: ${result.errorMessage}`);
        }

        if (result.success) {
          if (result.action in this.contadorAcoes) {
            this.contadorAcoes[result.action as keyof typeof this.contadorAcoes]++;
          }
          this.ultimaAcao = result.action;
        }

        await sleep(3000);
      } catch (erro) {
        console.error('❌ Erro no loop:', erro);
        await sleep(5000);
      }
    }
  }

  private async pensar(contexto: string, userBotId: string): Promise<BotAction | null> {
    if (!this.botManager.isConnected()) return null;

    try {
      const resposta = await this.llmProvider.invoke({
        contexto,
        ultimaAcao: this.ultimaAcao,
        contadorAcoes: JSON.stringify(this.contadorAcoes),
      }, userBotId, 'action_decision');

      const textoLimpo = resposta
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(textoLimpo);
      const decisao = botActionSchema.parse(parsed);

      return decisao;
    } catch (erro) {
      console.error('❌ Erro no raciocínio:', erro);
      return { acao: 'EXPLORAR' };
    }
  }

  private onBotConnected(): void {
    const bot = this.botManager.getBot();
    if (bot) {
      this.actionExecutor = new ActionExecutor(bot);
      this.perceptionManager = new PerceptionManager(bot);
      this.contadorAcoes = { FALAR: 0, ANDAR: 0, PULAR: 0, EXPLORAR: 0 };
    }
  }

  private onBotDisconnected(): void {
    this.actionExecutor = null;
    this.perceptionManager = null;
  }
}