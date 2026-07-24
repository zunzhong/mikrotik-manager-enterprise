import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

type PrismaClientConstructor = new () => PrismaClient;

function loadGeneratedClient(
  clientPath: string | undefined,
  label: string,
): PrismaClientConstructor {
  if (!clientPath) return PrismaClient;

  const require = createRequire(import.meta.url);
  const generated = require(resolve(clientPath)) as { PrismaClient?: PrismaClientConstructor };
  if (!generated.PrismaClient) {
    throw new Error(`${label} Prisma Client is invalid: ${clientPath}`);
  }
  return generated.PrismaClient;
}

function resolvePrismaClient(): PrismaClientConstructor {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    return loadGeneratedClient(process.env.PRISMA_POSTGRESQL_CLIENT_PATH, 'PostgreSQL');
  }
  if (databaseUrl.startsWith('mysql://')) {
    return loadGeneratedClient(process.env.PRISMA_MYSQL_CLIENT_PATH, 'MariaDB/MySQL');
  }
  return PrismaClient;
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
