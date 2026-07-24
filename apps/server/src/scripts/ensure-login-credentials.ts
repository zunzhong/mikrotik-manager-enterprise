import { prisma } from '../database/index.js';
import { passwordService } from '../modules/auth/application/password.service.js';

async function main() {
  const email = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD are required.');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Administrator account was not found: ${email}`);
  }

  const passwordMatches = passwordService.verify(password, user.passwordHash);
  if (!passwordMatches) {
    if (process.env.MME_REPAIR_LOGIN_CREDENTIALS !== '1') {
      throw new Error('The configured administrator password does not match the database account.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: passwordService.hash(password),
        role: 'admin',
        isActive: true,
      },
    });
  }

  console.log(
    JSON.stringify({
      email,
      passwordSynchronized: !passwordMatches,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
