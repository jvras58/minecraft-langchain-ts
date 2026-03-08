import { prisma } from './db';

/** Retorna o ID do UserBot, criando se necessário. */
export async function getOrCreateUserBot(name: string): Promise<string> {
  let userBot = await prisma.userBot.findFirst({ where: { name } });
  if (!userBot) {
    userBot = await prisma.userBot.create({ data: { name } });
  }
  return userBot.id;
}