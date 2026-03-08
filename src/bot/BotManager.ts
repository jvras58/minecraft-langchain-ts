import mineflayer, { Bot } from 'mineflayer';
import { BotConfig } from '../types/types';
import { MovementManager } from './MovementManager';
import { getOrCreateUserBot } from '../utils/userBot';

export class BotManager {
  private bot: Bot | null = null;
  private config: BotConfig;
  private connected = false;
  private onConnected?: () => void;
  private onDisconnected?: () => void;
  public userBotId: string | null = null;

  constructor(config: BotConfig) {
    this.config = config;
  }

  setCallbacks(onConnected: () => void, onDisconnected: () => void): void {
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
  }

  async createBot(): Promise<void> {
    console.log('🔌 Conectando ao servidor...');
    this.userBotId = await getOrCreateUserBot(this.config.username);
    this.bot = mineflayer.createBot(this.config);
    this.setupEvents();
  }

  getBot(): Bot | null {
    return this.bot;
  }

  isConnected(): boolean {
    return this.connected && this.bot !== null;
  }

  private setupEvents(): void {
    if (!this.bot) return;

    this.bot.on('spawn', () => {
      console.log('✅ Bot entrou no jogo!');
      this.connected = true;
      this.onConnected?.();
    });

    this.bot.on('chat', (user, msg) => {
      if (user === this.bot?.username) return;
      console.log(`💬 ${user}: ${msg}`);
    });

    this.bot.on('death', () => {
      console.log('💀 Morri! Respawnando...');
      if (this.bot) new MovementManager(this.bot).pararMovimento();
    });

    this.bot.on('end', (reason) => {
      console.log(`❌ Desconectado: ${reason}`);
      this.connected = false;
      this.onDisconnected?.();
      console.log('🔄 Reconectando em 5s...');
      setTimeout(() => this.createBot(), 5000);
    });

    this.bot.on('error', (err) => {
      console.error('⚠️  Erro:', err.message);
    });

    this.bot.on('kicked', (reason) => {
      console.log(`👢 Kickado: ${reason}`);
    });

    // Auto-pulo quando preso
    this.bot.on('physicsTick', () => {
      if (!this.bot || !this.isConnected()) return;
      if (!this.bot.entity.onGround) return;

      const walking =
        this.bot.controlState.forward ||
        this.bot.controlState.back ||
        this.bot.controlState.left ||
        this.bot.controlState.right;

      if (walking) {
        const v = this.bot.entity.velocity;
        if (Math.abs(v.x) < 0.01 && Math.abs(v.z) < 0.01 && Math.random() > 0.7) {
          this.bot.setControlState('jump', true);
        }
      }
    });
  }
}