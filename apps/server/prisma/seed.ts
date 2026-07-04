import { prisma } from '../src/database/index.js';
import { passwordService } from '../src/modules/auth/application/password.service.js';

const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`Admin user already exists: ${existing.email}`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: 'Default Admin',
      role: 'admin',
      isActive: true,
      passwordHash: passwordService.hash(password),
    },
  });

  console.log(`Admin user created: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
