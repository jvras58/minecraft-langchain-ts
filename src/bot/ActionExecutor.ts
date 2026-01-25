import { Bot } from 'mineflayer';
import { BotAction } from '../types/types';
import { goals, Movements } from 'mineflayer-pathfinder';

export class ActionExecutor {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  async executarAcao(decisao: BotAction): Promise<any> {
    const startTime = performance.now();
    const movements = new Movements(this.bot);

    try {
      switch (decisao.acao) {
        case 'COLETAR':
          const bloco = this.bot.findBlock({
            matching: (b) => b.name.includes(decisao.alvo || ''),
            maxDistance: 32
          });
          if (bloco) {
            await this.bot.collectBlock.collect(bloco);
            return { success: true, action: 'COLETAR', executionTime: performance.now() - startTime };
          }
          break;

        case 'IR_ATE':
          const alvo = this.bot.nearestEntity(e => e.username === decisao.alvo || e.name === decisao.alvo);
          if (alvo) {
            this.bot.pathfinder.setMovements(movements);
            await this.bot.pathfinder.goto(new goals.GoalFollow(alvo, 2));
            return { success: true, action: 'IR_ATE', executionTime: performance.now() - startTime };
          }
          break;

        case 'EXPLORAR':
          const x = this.bot.entity.position.x + (Math.random() * 40 - 20);
          const z = this.bot.entity.position.z + (Math.random() * 40 - 20);
          this.bot.pathfinder.setMovements(movements);
          await this.bot.pathfinder.goto(new goals.GoalNear(x, this.bot.entity.position.y, z, 1));
          return { success: true, action: 'EXPLORAR', executionTime: performance.now() - startTime };

        case 'PULAR':
          this.bot.setControlState('jump', true);
          await new Promise(resolve => setTimeout(resolve, 500));
          this.bot.setControlState('jump', false);
          return { success: true, action: 'PULAR', executionTime: performance.now() - startTime };

        case 'OLHAR':
          const entity = this.bot.nearestEntity();
          if (entity) await this.bot.lookAt(entity.position.offset(0, 1.6, 0));
          return { success: true, action: 'OLHAR', executionTime: performance.now() - startTime };

        case 'FALAR':
          if (decisao.conteudo) this.bot.chat(decisao.conteudo);
          return { success: true, action: 'FALAR', executionTime: performance.now() - startTime };

        case 'NADA':
          return { success: true, action: 'NADA', executionTime: performance.now() - startTime };
      }
    } catch (err) {
      console.error('Erro na ação:', err);
    }
    return { success: false, action: decisao.acao, executionTime: performance.now() - startTime };
  }
}