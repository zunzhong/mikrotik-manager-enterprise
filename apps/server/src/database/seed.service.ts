import { defaultPermissions } from '../modules/admin/domain/default-permissions.js';
import { passwordService } from '../modules/auth/application/password.service.js';
import { prisma } from './index.js';

export async function seedDatabase(): Promise<{ adminEmail: string; permissions: number }> {
  const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';

  if (process.env.NODE_ENV === 'production' && password === 'admin') {
    throw new Error('DEFAULT_ADMIN_PASSWORD phải được đặt thành mật khẩu mạnh trong production.');
  }

  for (const [key, name, description, category] of defaultPermissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { name, description, category },
      create: { key, name, description, category },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { key: 'admin' },
    update: { name: 'Administrator', description: 'Full system administrator', isSystem: true },
    create: {
      key: 'admin',
      name: 'Administrator',
      description: 'Full system administrator',
      isSystem: true,
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { key: 'viewer' },
    update: { name: 'Viewer', description: 'Read-only access', isSystem: true },
    create: { key: 'viewer', name: 'Viewer', description: 'Read-only access', isSystem: true },
  });

  const permissions = await prisma.permission.findMany();
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
  }

  for (const permission of permissions.filter((item) => item.key.endsWith('.read'))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: permission.id },
    });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin', isActive: true },
    create: {
      email,
      name: 'Default Admin',
      role: 'admin',
      isActive: true,
      passwordHash: passwordService.hash(password),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  return { adminEmail: user.email, permissions: permissions.length };
}
