import mineflayer, { Bot } from 'mineflayer';
import { BotConfig } from '../types/types';
import { MovementManager } from './MovementManager';

export class BotManager {
  private bot: Bot | null = null;
  private config: BotConfig;
  private connected = false;
  private onConnected?: () => void;
  private onDisconnected?: () => void;

  constructor(config: BotConfig) {
    this.config = config;
  }

  setCallbacks(onConnected: () => void, onDisconnected: () => void): void {
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
  }

  createBot(): void {
    console.log('🔌 Conectando ao servidor...');

    this.bot = mineflayer.createBot(this.config);

    this.setupEventHandlers();
  }

  getBot(): Bot | null {
    return this.bot;
  }

  isConnected(): boolean {
    return this.connected && this.bot !== null;
  }

  private setupEventHandlers(): void {
    if (!this.bot) return;

    this.bot.on('spawn', () => {
      console.log('✅ Bot entrou no jogo!');
      this.connected = true;
      this.onConnected?.();
    });

    this.bot.on('chat', (usuario, mensagem) => {
      if (usuario === this.bot?.username) return;
      console.log(`💬 ${usuario}: ${mensagem}`);
    });

    this.bot.on('death', () => {
      console.log('💀 Morri! Respawnando...');
      const movementManager = new MovementManager(this.bot!);
      movementManager.pararMovimento();
    });

    this.bot.on('end', (razao) => {
      console.log(`❌ Bot desconectado. Motivo: ${razao}`);
      this.connected = false;
      this.onDisconnected?.();
      const movementManager = new MovementManager(this.bot!);
      movementManager.pararMovimento();

      console.log('🔄 Reconectando em 5 segundos...');
      setTimeout(() => this.createBot(), 5000);
    });

    this.bot.on('error', (erro) => {
      console.error('⚠️  Erro de conexão:', erro.message);
    });

    this.bot.on('kicked', (razao) => {
      console.log(`👢 Fui kickado! Razão: ${razao}`);
    });

    // Evento: Colidiu com algo
    this.bot.on('physicsTick', () => {
      if (!this.bot || !this.isConnected()) return;

      // Se está colidindo, tenta pular
      if (this.bot.entity.onGround && this.bot.entity.velocity.y === 0) {
        const estaAndando =
          this.bot.controlState.forward ||
          this.bot.controlState.back ||
          this.bot.controlState.left ||
          this.bot.controlState.right;

        // Se está tentando andar mas não se move, pula
        if (estaAndando) {
          const vel = this.bot.entity.velocity;
          if (Math.abs(vel.x) < 0.01 && Math.abs(vel.z) < 0.01) {
            // Às vezes pula para superar obstáculos
            if (Math.random() > 0.7) {
              this.bot.setControlState('jump', true);
            }
          }
        }
      }
    });
  }
}