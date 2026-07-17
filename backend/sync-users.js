/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncClerkUsers() {
  const response = await fetch('https://api.clerk.com/v1/users', {
    headers: { Authorization: `Bearer sk_test_ArBwv0MjPKq8WiqQGANZNYKp53VzdEyQZraYGEunmo` }
  });
  const users = await response.json();
  
  for (const user of users) {
    const email = user.email_addresses.find(e => e.id === user.primary_email_address_id)?.email_address;
    if (email) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
      await prisma.user.upsert({
        where: { clerkId: user.id },
        update: { email, fullName },
        create: { clerkId: user.id, email, fullName }
      });
      console.log('Synced', email);
    }
  }
}
syncClerkUsers().catch(console.error).finally(() => prisma.$disconnect());
