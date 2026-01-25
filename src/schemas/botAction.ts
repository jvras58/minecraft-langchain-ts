import { z } from 'zod';

export const botActionSchema = z.object({
  acao: z.enum(["FALAR", "ANDAR", "PULAR", "OLHAR", "EXPLORAR", "PARAR", "NADA", "MINERAR"]),
  direcao: z.enum(["frente", "tras", "esquerda", "direita", "aleatorio"]).optional(),
  conteudo: z.string().optional(),
  alvo: z.string().optional(),
});

export type BotAction = z.infer<typeof botActionSchema>;