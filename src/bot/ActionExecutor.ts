import { Bot } from 'mineflayer';
import { BotAction } from '../types/types';
import { MovementManager } from './MovementManager';

export interface ActionResult {
  success: boolean;
  action: string;
  direction?: string;
  content?: string;
  errorMessage?: string;
  executionTime: number;
}


/**
 * Executa ações do bot
 */
export class ActionExecutor {
  private bot: Bot;
  private movementManager: MovementManager;

  constructor(bot: Bot) {
    this.bot = bot;
    this.movementManager = new MovementManager(bot);
  }

  async executarAcao(decisao: BotAction): Promise<ActionResult> {
    const startTime = performance.now();

    try {
      switch (decisao.acao) {
        case 'FALAR':
          if (decisao.conteudo) {
            this.bot.chat(decisao.conteudo);
            console.log(`🗣️  Falei: ${decisao.conteudo}`);
          }
          break;

        case 'ANDAR':
          const direcao = decisao.direcao || 'frente';
          this.movementManager.andarNaDirecao(direcao);
          console.log(`🚶 Andando para ${direcao}`);
          break;

        case 'EXPLORAR':
          this.movementManager.explorarAleatorio();
          console.log('🗺️  Explorando o mundo...');
          break;

        case 'PULAR':
          await this.movementManager.pular();
          console.log('🦘 Pulei!');
          break;

        case 'PARAR':
          this.movementManager.pararMovimento();
          console.log('🛑 Parei de andar');
          break;

        case 'OLHAR':
          this.olharAoRedor();
          break;

        case 'NADA':
          console.log('💤 Não fiz nada...');
          break;
      }

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        action: decisao.acao,
        direction: decisao.direcao,
        content: decisao.conteudo,
        executionTime,
      };
    } catch (erro) {
      const executionTime = performance.now() - startTime;
      const errorMessage = erro instanceof Error ? erro.message : String(erro);

      console.error('❌ Erro ao executar ação:', erro);

      return {
        success: false,
        action: decisao.acao,
        direction: decisao.direcao,
        content: decisao.conteudo,
        errorMessage,
        executionTime,
      };
    }
  }

  private olharAoRedor(): void {
    const jogadores = Object.values(this.bot.players).filter(
      (p) => p.username !== this.bot.username && p.entity
    );

    if (jogadores.length > 0) {
      const jogadorAleatorio =
        jogadores[Math.floor(Math.random() * jogadores.length)];
      if (jogadorAleatorio.entity) {
        this.bot.lookAt(jogadorAleatorio.entity.position.offset(0, 1.6, 0));
        console.log(`👀 Olhei para ${jogadorAleatorio.username}`);
      }
    } else {
      const yaw = Math.random() * Math.PI * 2;
      this.bot.look(yaw, 0);
      console.log('👀 Olhei ao redor');
    }
  }
}