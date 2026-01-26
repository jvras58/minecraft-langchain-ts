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
          let tentativas = 0;
          const maxTentativas = 5;
          while (tentativas < maxTentativas) {
            const x = this.bot.entity.position.x + (Math.random() * 40 - 20);
            const z = this.bot.entity.position.z + (Math.random() * 40 - 20);
            const y = this.bot.entity.position.y;
            const goal = new goals.GoalNear(x, y, z, 1);
            
            try {
              this.bot.pathfinder.setMovements(movements);
              await this.bot.pathfinder.goto(goal);
              return { success: true, action: 'EXPLORAR', executionTime: performance.now() - startTime };
            } catch (err) {
              tentativas++;
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.warn(`Tentativa ${tentativas} falhou para EXPLORAR: ${errorMessage}`);
            }
          }
          // Fallback: mover aleatoriamente sem pathfinder
          this.bot.setControlState('forward', true);
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.bot.setControlState('forward', false);
          return { success: false, action: 'EXPLORAR', executionTime: performance.now() - startTime };


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

        case 'ANDAR':
          this.bot.setControlState('forward', true);
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.bot.setControlState('forward', false);
          return { success: true, action: 'ANDAR', executionTime: performance.now() - startTime };
        case 'PARAR':
          this.bot.clearControlStates();
          if (this.bot.pathfinder) {
            try {
              this.bot.pathfinder.stop();
              this.bot.pathfinder.setGoal(null);
            } catch {
              // Ignorar erros ao parar o pathfinder
            }
          }
          return { success: true, action: 'PARAR', executionTime: performance.now() - startTime };
        case 'MINERAR':
          if (decisao.alvo) {
            const blocoMinerar = this.bot.findBlock({
              matching: (b) => b.name.includes(decisao.alvo || ''),
              maxDistance: 32
            });
            if (blocoMinerar) {
              await this.bot.dig(blocoMinerar);
              return { success: true, action: 'MINERAR', executionTime: performance.now() - startTime };
            }
          }
          break;

        case 'NADA':
          return { success: true, action: 'NADA', executionTime: performance.now() - startTime };
      }
    } catch (err) {
      console.error('Erro na ação:', err);
    }
    return { success: false, action: decisao.acao, executionTime: performance.now() - startTime };
  }
}