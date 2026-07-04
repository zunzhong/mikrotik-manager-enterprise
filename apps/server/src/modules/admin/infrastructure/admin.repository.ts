import { prisma } from '../../../database/index.js';

export class AdminRepository {
  public listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roles: {
          include: { role: true },
        },
      },
    });
  }

  public listRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
        users: true,
      },
    });
  }

  public listPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  public async assignUserRole(userId: string, roleId: string) {
    return prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  public async assignRolePermission(roleId: string, permissionId: string) {
    return prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }
}

export const adminRepository = new AdminRepository();
