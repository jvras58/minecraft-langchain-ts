import { Bot } from 'mineflayer';

export class PerceptionManager {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  getGameContext(): string {
    const vida = this.bot.health;
    const fome = this.bot.food;
    const posicao = this.bot.entity.position;
    const velocidade = this.bot.entity.velocity;
    const estaAndando = Math.abs(velocidade.x) > 0.01 || Math.abs(velocidade.z) > 0.01;

    const jogadoresProximos = Object.keys(this.bot.players).filter(
      (nome) => nome !== this.bot.username
    );

    return `
    Vida: ${vida.toFixed(0)}/20
    Fome: ${fome}/20
    Posição: X=${posicao.x.toFixed(0)} Y=${posicao.y.toFixed(0)} Z=${posicao.z.toFixed(0)}
    Está andando: ${estaAndando ? 'SIM' : 'NÃO'}
    Jogadores próximos: ${jogadoresProximos.length > 0 ? jogadoresProximos.join(', ') : 'nenhum'}
    Hora do dia: ${this.bot.time.timeOfDay}
    `.trim();
  }
}