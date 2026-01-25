import { Bot } from 'mineflayer';

/**
 * Gere a perceção do bot, consolidando dados do mundo e ordens do chat para o LLM.
 */
export class PerceptionManager {
  private bot: Bot;
  private ultimaOrdemMestre: string = "";

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Atualiza a última ordem recebida por um superusuário.
   */
  public setOrdemMestre(ordem: string): void {
    this.ultimaOrdemMestre = ordem;
  }

  /**
   * Limpa a ordem atual (útil após o bot confirmar que concluiu a tarefa).
   */
  public limparOrdem(): void {
    this.ultimaOrdemMestre = "";
  }

  /**
   * Gera o contexto textual completo que será enviado ao prompt do LLM.
   */
  public getGameContext(): string {
    const pos = this.bot.entity.position;
    const health = Math.round(this.bot.health);
    const food = Math.round(this.bot.food);
    
    return `
      --- STATUS DO BOT ---
      Posição Atual: x: ${pos.x.toFixed(1)}, y: ${pos.y.toFixed(1)}, z: ${pos.z.toFixed(1)}
      Saúde: ${health}/20 | Fome: ${food}/20
      
      --- INVENTÁRIO ---
      ${this.getInventorySummary()}
      
      --- AMBIENTE (VISÃO) ---
      Blocos próximos detetados: ${this.getNearbyInterestingBlocks()}
      Entidades próximas: ${this.getNearbyEntities()}
      
      --- COMANDOS DO MESTRE (PRIORIDADE) ---
      Ordem atual: ${this.ultimaOrdemMestre ? `"${this.ultimaOrdemMestre}"` : "Nenhuma ordem pendente. Age por conta própria."}
    `.trim();
  }

  /**
   * Resume o inventário para não gastar excesso de tokens.
   */
  private getInventorySummary(): string {
    const items = this.bot.inventory.items();
    if (items.length === 0) return "O inventário está vazio.";
    return items.map(item => `${item.count}x ${item.name}`).join(', ');
  }

  /**
   * Deteta blocos relevantes ao redor para que o LLM saiba o que pode coletar.
   */
  private getNearbyInterestingBlocks(): string {
    // Lista de blocos que o bot "reconhece" como úteis para o TCC
    const interestingNames = ['log', 'stone', 'ore', 'dirt', 'grass', 'wood', 'chest'];
    
    const blocks = this.bot.findBlocks({
      matching: (block) => interestingNames.some(name => block.name.includes(name)),
      maxDistance: 16,
      count: 8
    });

    if (blocks.length === 0) return "Nenhum bloco de interesse avistado.";

    // Mapeia os nomes únicos dos blocos encontrados
    const uniqueBlockNames = Array.from(new Set(blocks.map(p => this.bot.blockAt(p)?.name || "desconhecido")));
    return uniqueBlockNames.join(', ');
  }

  /**
   * Identifica jogadores e mobs próximos para interação.
   */
  private getNearbyEntities(): string {
    const entities = Object.values(this.bot.entities)
      .filter(e => e.id !== this.bot.entity.id) // Não detetar a si mesmo
      .filter(e => e.type === 'player' || e.type === 'mob')
      .filter(e => e.position.distanceTo(this.bot.entity.position) < 12);

    if (entities.length === 0) return "Ninguém por perto.";
    
    return entities
      .map(e => `${e.type === 'player' ? 'Jogador' : 'Mob'}: ${e.username || e.name}`)
      .join(', ');
  }
}