import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const medications = await prisma.medication.findMany({
    where: { userId: 'cmrnmql5a0000oui3bfs5x67i' }
  });
  console.log(medications.map(m => ({ id: m.id, isActive: m.isActive, status: (m as any).status })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
