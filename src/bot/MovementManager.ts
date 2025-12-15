import { Bot, ControlState } from 'mineflayer';

export class MovementManager {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  andarNaDirecao(direcao: string): void {
    this.pararMovimento();

    switch (direcao) {
      case 'frente':
        this.bot.setControlState('forward', true);
        break;
      case 'tras':
        this.bot.setControlState('back', true);
        break;
      case 'esquerda':
        this.bot.setControlState('left', true);
        break;
      case 'direita':
        this.bot.setControlState('right', true);
        break;
      case 'aleatorio':
        const direcoes: ControlState[] = ['forward', 'back', 'left', 'right'];
        const dir = direcoes[Math.floor(Math.random() * direcoes.length)];
        this.bot.setControlState(dir, true);
        break;
    }

    // Para automaticamente após 2-4 segundos
    const tempo = 2000 + Math.random() * 2000;
    setTimeout(() => this.pararMovimento(), tempo);
  }

  explorarAleatorio(): void {
    this.pararMovimento();

    // Escolhe direção aleatória
    const direcoes: ControlState[] = ['forward', 'back', 'left', 'right'];
    const dir = direcoes[Math.floor(Math.random() * direcoes.length)];

    this.bot.setControlState(dir, true);

    // Olha para direção aleatória
    const yaw = Math.random() * Math.PI * 2;
    this.bot.look(yaw, 0);

    // Para após 3-6 segundos
    const tempo = 3000 + Math.random() * 3000;
    setTimeout(() => this.pararMovimento(), tempo);
  }

  pararMovimento(): void {
    this.bot.setControlState('forward', false);
    this.bot.setControlState('back', false);
    this.bot.setControlState('left', false);
    this.bot.setControlState('right', false);
    this.bot.setControlState('sprint', false);
  }

  async pular(): Promise<void> {
    this.bot.setControlState('jump', true);
    await this.sleep(100);
    this.bot.setControlState('jump', false);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}