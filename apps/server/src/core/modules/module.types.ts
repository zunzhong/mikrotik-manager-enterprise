import type { FastifyInstance } from 'fastify';

export interface CoreModuleContext {
  app: FastifyInstance;
}

export interface CoreModule {
  name: string;
  version: string;
  description?: string;

  load?(context: CoreModuleContext): Promise<void> | void;
  registerRoutes?(context: CoreModuleContext): Promise<void> | void;
  registerScheduler?(context: CoreModuleContext): Promise<void> | void;
  shutdown?(): Promise<void> | void;
}

export interface RegisteredModuleInfo {
  name: string;
  version: string;
  description?: string;
  loaded: boolean;
}
