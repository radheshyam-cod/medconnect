const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const docs = await prisma.document.findMany({ include: { extractions: true } });
  console.log('DOCS:', JSON.stringify(docs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
