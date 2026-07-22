import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

type PrismaClientConstructor = new () => PrismaClient;

function resolvePrismaClient(): PrismaClientConstructor {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    return PrismaClient;
  }

  const clientPath = process.env.PRISMA_POSTGRESQL_CLIENT_PATH;
  if (!clientPath) return PrismaClient;

  const require = createRequire(import.meta.url);
  const generated = require(resolve(clientPath)) as { PrismaClient?: PrismaClientConstructor };
  if (!generated.PrismaClient) {
    throw new Error(`PostgreSQL Prisma Client không hợp lệ: ${clientPath}`);
  }
  return generated.PrismaClient;
}

/**
 * PrismaService
 *
 * Wraps Prisma Client to keep database access centralized.
 */
export class PrismaService {
  private readonly client = new (resolvePrismaClient())();

  public get db(): PrismaClient {
    return this.client;
  }

  public async connect(): Promise<void> {
    await this.client.$connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const prismaService = new PrismaService();
export const prisma = prismaService.db;
