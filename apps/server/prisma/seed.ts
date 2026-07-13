import { prisma } from '../src/database/index.js';
import { seedDatabase } from '../src/database/seed.service.js';

seedDatabase()
  .then((result) => {
    console.log(`Admin user ready: ${result.adminEmail}`);
    console.log(`Permissions seeded: ${result.permissions}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
