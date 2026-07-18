import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const t = await prisma.timeline.findFirst();
  if (t) console.log(Object.keys(t));
}
main().catch(console.error).finally(() => prisma.$disconnect());
