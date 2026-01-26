import mineflayer, { Bot } from 'mineflayer';
const pathfinderPkg = require('mineflayer-pathfinder');
const collectBlockPkg = require('mineflayer-collectblock');
const toolPkg = require('mineflayer-tool');
const autoeatPkg = require('mineflayer-auto-eat');

import { BotConfig } from '../types/types';
import { MovementManager } from './MovementManager';
import { getOrCreateUserBot } from '../utils/metrics';
import { PerceptionManager } from './PerceptionManager';

/**
 * Gerencia a criação e gerenciamento do bot
 * Inclui: conexão, desconexão, eventos e movimentos
 */
export class BotManager {
  private bot: Bot | null = null;
  private config: BotConfig;
  private connected = false;
  private onConnected?: () => void;
  private onDisconnected?: () => void;
  public userBotId: string | null = null;
  public perceptionManager: PerceptionManager | null = null;

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
    
    this.perceptionManager = new PerceptionManager(this.bot);

    // Carregamento de Plugins
    this.bot.loadPlugin(pathfinderPkg.pathfinder);
    this.bot.loadPlugin(collectBlockPkg.plugin);
    this.bot.loadPlugin(toolPkg.plugin);
    this.bot.loadPlugin(autoeatPkg.loader);

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

      // Configuração do Auto-Eat após spawn usando setOpts
      if (this.bot?.autoEat) {
        this.bot.autoEat.setOpts({
          priority: 'foodPoints',
          startAt: 14,
          bannedFood: ['rotten_flesh', 'pufferfish', 'spider_eye', 'poisonous_potato']
        });
      }

      this.onConnected?.();
    });

    this.bot.on('chat', (username, message) => {
      if (username === this.bot?.username) return;

      // TODO: Colocar como .env ou configuração externa...
      const mestre = "jvras58"; 

      if (username === mestre) {
        console.log(`👑 Ordem recebida de ${username}: ${message}`);
        this.perceptionManager?.setOrdemMestre(message);
        
        this.bot?.lookAt(this.bot.players[username]?.entity?.position.offset(0, 1.6, 0) || this.bot.entity.position);
      }
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

    this.bot.on('autoeat_started', () => console.log('🍴 Estou a comer...'));

    this.bot.on('physicsTick', () => {
      if (!this.bot || !this.isConnected()) return;

      if (this.bot.entity.onGround && this.bot.entity.velocity.y === 0) {
        const estaAndando =
          this.bot.controlState.forward ||
          this.bot.controlState.back ||
          this.bot.controlState.left ||
          this.bot.controlState.right;

        if (estaAndando) {
          const vel = this.bot.entity.velocity;
          if (Math.abs(vel.x) < 0.01 && Math.abs(vel.z) < 0.01) {
            if (Math.random() > 0.7) {
              this.bot.setControlState('jump', true);
            }
          }
        }
      }
    });
  }
}