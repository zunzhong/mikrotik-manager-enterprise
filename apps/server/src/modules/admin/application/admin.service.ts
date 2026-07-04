import { adminRepository } from '../infrastructure/admin.repository.js';

export class AdminService {
  public users() {
    return adminRepository.listUsers();
  }

  public roles() {
    return adminRepository.listRoles();
  }

  public permissions() {
    return adminRepository.listPermissions();
  }

  public assignUserRole(userId: string, roleId: string) {
    return adminRepository.assignUserRole(userId, roleId);
  }

  public assignRolePermission(roleId: string, permissionId: string) {
    return adminRepository.assignRolePermission(roleId, permissionId);
  }
}

export const adminService = new AdminService();
