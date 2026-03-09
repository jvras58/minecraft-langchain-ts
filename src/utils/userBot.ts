import { prisma } from './db';


export async function getOrCreateUserBot(name: string): Promise<string> {
  const userBot = await prisma.userBot.upsert({
    where: { name },
    update: {},
    create: { name },
    select: { id: true },
  });
  return userBot.id;
}