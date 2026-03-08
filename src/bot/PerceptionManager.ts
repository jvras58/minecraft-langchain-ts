import { Bot } from 'mineflayer';
import {
  GameContext,
  EntityInfo,
  BlockInfo,
  InventoryItem,
} from '../types/types';
import { agentConfig } from '../config/settings';

/**
 * Coleta dados ricos do ambiente para alimentar a IA.
 *
 * Quanto mais contexto a LLM recebe, melhores são as decisões.
 * Todos os dados são coletados de forma síncrona (sem I/O extra).
 */
export class PerceptionManager {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  getGameContext(): GameContext {
    return {
      vida: this.bot.health,
      fome: this.bot.food,
      posicao: {
        x: Math.round(this.bot.entity.position.x),
        y: Math.round(this.bot.entity.position.y),
        z: Math.round(this.bot.entity.position.z),
      },
      estaAndando: this.isMoving(),
      jogadoresProximos: this.getNearbyPlayerNames(),
      entidadesProximas: this.getNearbyEntities(),
      blocosProximos: this.getNearbyBlocks(),
      horaDoDia: this.bot.time.timeOfDay,
      clima: this.bot.isRaining ? 'chuva' : 'limpo',
      inventario: this.getInventory(),
      bioma: this.getBiome(),
    };
  }

  /** Serializa o contexto em texto compacto para o prompt. */
  getContextString(): string {
    const ctx = this.getGameContext();

    const parts = [
      `Vida: ${ctx.vida.toFixed(0)}/20 | Fome: ${ctx.fome}/20`,
      `Posição: X=${ctx.posicao.x} Y=${ctx.posicao.y} Z=${ctx.posicao.z}`,
      `Bioma: ${ctx.bioma} | Clima: ${ctx.clima} | Hora: ${ctx.horaDoDia}`,
      `Andando: ${ctx.estaAndando ? 'SIM' : 'NÃO'}`,
    ];

    // Jogadores
    if (ctx.jogadoresProximos.length > 0) {
      parts.push(`Jogadores próximos: ${ctx.jogadoresProximos.join(', ')}`);
    } else {
      parts.push('Jogadores próximos: nenhum');
    }

    // Entidades (top 5 por distância)
    if (ctx.entidadesProximas.length > 0) {
      const entStr = ctx.entidadesProximas
        .slice(0, 5)
        .map((e) => `${e.nome}(${e.tipo}, ${e.distancia.toFixed(1)}m)`)
        .join(', ');
      parts.push(`Entidades: ${entStr}`);
    }

    // Blocos notáveis (top 5)
    if (ctx.blocosProximos.length > 0) {
      const blockStr = ctx.blocosProximos
        .slice(0, 5)
        .map((b) => `${b.nome}(${b.distancia.toFixed(1)}m)`)
        .join(', ');
      parts.push(`Blocos notáveis: ${blockStr}`);
    }

    // Inventário
    if (ctx.inventario.length > 0) {
      const invStr = ctx.inventario
        .slice(0, 8)
        .map((i) => `${i.nome}x${i.quantidade}`)
        .join(', ');
      parts.push(`Inventário: ${invStr}`);
    } else {
      parts.push('Inventário: vazio');
    }

    return parts.join('\n');
  }

  private isMoving(): boolean {
    const v = this.bot.entity.velocity;
    return Math.abs(v.x) > 0.01 || Math.abs(v.z) > 0.01;
  }

  private getNearbyPlayerNames(): string[] {
    return Object.keys(this.bot.players).filter(
      (name) => name !== this.bot.username,
    );
  }

  private getNearbyEntities(): EntityInfo[] {
    const entities: EntityInfo[] = [];
    const botPos = this.bot.entity.position;

    for (const entity of Object.values(this.bot.entities)) {
      if (entity === this.bot.entity) continue;
      const dist = botPos.distanceTo(entity.position);
      if (dist > agentConfig.perceptionEntityRadius) continue;

      entities.push({
        nome: entity.username || entity.displayName || `entity_${entity.id}`,
        tipo: entity.type || 'desconhecido',
        distancia: dist,
        vida: (entity as any).health,
      });
    }

    return entities.sort((a, b) => a.distancia - b.distancia);
  }

  private getNearbyBlocks(): BlockInfo[] {
    const blocks: BlockInfo[] = [];
    const botPos = this.bot.entity.position;
    const r = agentConfig.perceptionBlockRadius;

    // Apenas blocos "interessantes" (não ar, não stone genérica)
    const boring = new Set([
      'air', 'cave_air', 'void_air', 'stone', 'dirt', 'grass_block',
      'bedrock', 'deepslate', 'water', 'lava',
    ]);

    for (let dx = -r; dx <= r; dx += 2) {
      for (let dy = -3; dy <= 3; dy += 1) {
        for (let dz = -r; dz <= r; dz += 2) {
          try {
            const block = this.bot.blockAt(
              botPos.offset(dx, dy, dz),
            );
            if (!block || boring.has(block.name)) continue;

            const dist = botPos.distanceTo(block.position);
            blocks.push({
              nome: block.name,
              posicao: {
                x: block.position.x,
                y: block.position.y,
                z: block.position.z,
              },
              distancia: dist,
            });
          } catch {
            // Block fora do mundo carregado
          }
        }
      }
    }

    // Deduplica por nome, mantém o mais próximo
    const uniqueMap = new Map<string, BlockInfo>();
    for (const b of blocks.sort((a, c) => a.distancia - c.distancia)) {
      if (!uniqueMap.has(b.nome)) {
        uniqueMap.set(b.nome, b);
      }
    }

    return Array.from(uniqueMap.values()).slice(0, 10);
  }

  private getInventory(): InventoryItem[] {
    return this.bot.inventory.items().map((item) => ({
      nome: item.name,
      quantidade: item.count,
      slot: item.slot,
    }));
  }

  private getBiome(): string {
    try {
      const pos = this.bot.entity.position;
      const block = this.bot.blockAt(pos);
      return (block as any)?.biome?.name ?? 'desconhecido';
    } catch {
      return 'desconhecido';
    }
  }
}