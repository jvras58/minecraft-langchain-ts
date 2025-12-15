import { z } from 'zod';

export const botActionSchema = z.object({
  acao: z.enum(['FALAR', 'ANDAR', 'PULAR', 'OLHAR', 'EXPLORAR', 'PARAR', 'NADA']),
  conteudo: z.string().optional(),
  direcao: z.enum(['frente', 'tras', 'esquerda', 'direita', 'aleatorio']).optional(),
});

export type BotAction = z.infer<typeof botActionSchema>;