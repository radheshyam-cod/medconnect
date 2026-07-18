const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({ include: { extractions: true } });
  
  for (const doc of docs) {
    if (doc.extractions && doc.extractions.length > 0) {
      const ext = doc.extractions[0];
      const labValues = ext.labValues;
      
      if (Array.isArray(labValues) && labValues.length > 0) {
        console.log(`Fixing lab values for doc: ${doc.id}`);
        for (const labStr of labValues) {
          if (typeof labStr === 'string') {
            const parts = labStr.split(':');
            if (parts.length >= 2) {
              const testName = parts[0].trim();
              const valueStr = parts.slice(1).join(':').trim();
              
              const valParts = valueStr.split(' ');
              const value = valParts[0];
              const unit = valParts.slice(1).join(' ');
              
              await prisma.labResult.create({
                data: {
                  userId: doc.userId,
                  testName: testName,
                  value: value,
                  unit: unit || null,
                  date: new Date(),
                  isAbnormal: false
                }
              });
              console.log(`Created lab result: ${testName} = ${value} ${unit}`);
            }
          }
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
