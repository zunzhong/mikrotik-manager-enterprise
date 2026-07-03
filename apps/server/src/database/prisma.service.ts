import { PrismaClient } from '@prisma/client';

/**
 * PrismaService
 *
 * Wraps Prisma Client to keep database access centralized.
 */
export class PrismaService {
  private readonly client = new PrismaClient();

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
