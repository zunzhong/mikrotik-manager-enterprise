import { statfs } from 'node:fs/promises';
import type { FastifyInstance } from 'fastify';
import { config } from '../config/config.service.js';
import { prisma, prismaService } from '../database/index.js';

const MIN_FREE_STORAGE_BYTES = 1024 * 1024 * 1024;

export async function setupRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/setup/preflight', async () => {
    const database = await prismaService.healthCheck();
    let schema = false;
    let adminUser = false;

    if (database) {
      try {
        const [users, roles] = await Promise.all([
          prisma.user.count({ where: { isActive: true, role: 'admin' } }),
          prisma.role.count(),
        ]);
        schema = roles > 0;
        adminUser = users > 0;
      } catch {
        schema = false;
      }
    }

    let freeStorageBytes = 0;
    try {
      const storage = await statfs(
        process.env.BACKUP_STORAGE_DIR ?? process.env.BACKUP_STORAGE_PATH ?? process.cwd(),
      );
      freeStorageBytes = storage.bavail * storage.bsize;
    } catch {
      freeStorageBytes = 0;
    }

    const productionSecrets =
      !config.app.isProduction ||
      (Boolean(process.env.JWT_SECRET) &&
        Boolean(process.env.ENCRYPTION_KEY) &&
        process.env.ENCRYPTION_KEY !== 'change-me-32-byte-minimum-secret-key');

    const checks = {
      database,
      schema,
      adminUser,
      storage: freeStorageBytes >= MIN_FREE_STORAGE_BYTES,
      environment: productionSecrets,
    };

    return {
      success: true,
      data: {
        ready: Object.values(checks).every(Boolean),
        checks,
        storage: {
          freeBytes: freeStorageBytes,
          minimumBytes: MIN_FREE_STORAGE_BYTES,
        },
        guidance: {
          database: database
            ? null
            : 'Chưa kết nối được cơ sở dữ liệu. Hãy khởi động dịch vụ dữ liệu rồi chạy pnpm setup:database.',
          schema: schema
            ? null
            : 'Chạy pnpm setup:database để tạo cấu trúc dữ liệu và các vai trò mặc định.',
          adminUser: adminUser
            ? null
            : 'Đặt DEFAULT_ADMIN_PASSWORD rồi chạy pnpm setup:database để tạo quản trị viên.',
          environment: productionSecrets
            ? null
            : 'Phải đặt JWT_SECRET và ENCRYPTION_KEY riêng, đủ mạnh trước khi triển khai production.',
        },
      },
    };
  });
}
