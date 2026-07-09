import { prisma } from '../../../database/index.js';
import { passwordService } from './password.service.js';

export async function createDefaultAdminUser() {
  const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      name: 'Default Admin',
      role: 'admin',
      isActive: true,
      passwordHash: passwordService.hash(password),
    },
  });
}
