import { MemoryEntry } from '../types/types';
import { agentConfig } from '../config/settings';

/**
 * Memória de curto prazo do bot.
 *
 * Mantém um buffer circular das últimas N entradas (ações, eventos, observações).
 * Isso permite que a LLM saiba o que o bot fez recentemente, evitando:
 * - Repetir a mesma ação em loop
 * - Ignorar eventos importantes (jogador falou, mob atacou, etc.)
 * - Tomar decisões sem contexto temporal
 *
 * Estratégia: ring buffer em memória — zero I/O, zero overhead.
 */
export class MemoryManager {
  private entries: MemoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize?: number) {
    this.maxSize = maxSize ?? agentConfig.shortTermMemorySize;
  }

  /** Adiciona uma entrada na memória. Remove a mais antiga se exceder o limite. */
  add(
    tipo: MemoryEntry['tipo'],
    resumo: string,
    dados?: Record<string, unknown>,
  ): void {
    this.entries.push({ timestamp: Date.now(), tipo, resumo, dados });
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  /** Atalhos semânticos */
  recordAction(acao: string, sucesso: boolean, detalhe?: string): void {
    const status = sucesso ? '✓' : '✗';
    this.add('acao', `[${status}] ${acao}${detalhe ? ': ' + detalhe : ''}`);
  }

  recordEvent(evento: string): void {
    this.add('evento', evento);
  }

  recordObservation(obs: string): void {
    this.add('observacao', obs);
  }

  recordInteraction(jogador: string, mensagem: string): void {
    this.add('interacao', `${jogador} disse: "${mensagem}"`);
  }

  /** Serializa a memória para incluir no prompt. */
  toPromptString(): string {
    if (this.entries.length === 0) return 'Nenhum evento recente.';

    return this.entries
      .map((e) => {
        const age = Math.round((Date.now() - e.timestamp) / 1000);
        return `[${age}s atrás] ${e.resumo}`;
      })
      .join('\n');
  }

  /** Retorna contagem de ações recentes por tipo (útil para evitar repetição). */
  getActionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of this.entries) {
      if (e.tipo !== 'acao') continue;
      // Extrai o nome da ação do resumo "[✓] ANDAR: frente" → "ANDAR"
      const match = e.resumo.match(/\[.\] (\w+)/);
      if (match) {
        counts[match[1]] = (counts[match[1]] || 0) + 1;
      }
    }
    return counts;
  }

  /** Verifica se houve interação recente de um jogador (últimos N segundos). */
  hasRecentInteraction(segundos: number = 30): boolean {
    const cutoff = Date.now() - segundos * 1000;
    return this.entries.some(
      (e) => e.tipo === 'interacao' && e.timestamp > cutoff,
    );
  }

  clear(): void {
    this.entries = [];
  }
}