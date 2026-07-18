import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const link = await prisma.shareLink.findFirst({
    where: { token: 'cmrqoaenv001rousyy3h62u6t' },
  });
  console.log('ShareLink userId:', link?.userId);
  
  const user = await prisma.user.findUnique({ where: { id: link?.userId }});
  console.log('User:', user?.fullName, user?.id);

  const medications = await prisma.medication.findMany({
    where: { userId: link?.userId }
  });
  console.log('Medications count:', medications.length);
  
  if (medications.length === 0) {
    const allMeds = await prisma.medication.findMany();
    console.log('All meds in DB:', allMeds.map(m => ({ name: m.name, userId: m.userId })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
