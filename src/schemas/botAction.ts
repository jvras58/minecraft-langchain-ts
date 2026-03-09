import { z } from 'zod';

const DIRECAO_MAP: Record<string, 'frente' | 'tras' | 'esquerda' | 'direita' | 'aleatorio'> = {
  frente: 'frente', forward: 'frente', front: 'frente',
  tras: 'tras', trás: 'tras', back: 'tras', backward: 'tras', behind: 'tras',
  esquerda: 'esquerda', left: 'esquerda',
  direita: 'direita', right: 'direita',
  aleatorio: 'aleatorio', aleatório: 'aleatorio', random: 'aleatorio',
};

export const botActionSchema = z.object({
  acao: z.enum(['FALAR', 'ANDAR', 'PULAR', 'OLHAR', 'EXPLORAR', 'PARAR', 'NADA', 'SEGUIR', 'FUGIR', 'COLETAR', 'ATACAR']),
  conteudo: z.string().optional(),
  direcao: z.preprocess(
    (v) => (typeof v === 'string' ? (DIRECAO_MAP[v.toLowerCase()] ?? v) : v),
    z.enum(['frente', 'tras', 'esquerda', 'direita', 'aleatorio']).optional().catch(undefined),
  ),
  raciocinio: z.string().optional(),
  alvo: z.string().optional(),
});

export type BotAction = z.infer<typeof botActionSchema>;