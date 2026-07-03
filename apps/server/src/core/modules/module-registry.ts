import type { FastifyInstance } from 'fastify';
import type { CoreModule, CoreModuleContext, RegisteredModuleInfo } from './module.types.js';

/**
 * ModuleRegistry
 *
 * Owns enterprise backend modules and their lifecycle.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, CoreModule>();
  private readonly loadedModules = new Set<string>();

  public register(module: CoreModule): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Core module already registered: ${module.name}`);
    }

    this.modules.set(module.name, module);
  }

  public async loadAll(app: FastifyInstance): Promise<void> {
    const context: CoreModuleContext = { app };

    for (const module of this.modules.values()) {
      await module.load?.(context);
      await module.registerRoutes?.(context);
      await module.registerScheduler?.(context);
      this.loadedModules.add(module.name);
    }
  }

  public async shutdownAll(): Promise<void> {
    for (const module of [...this.modules.values()].reverse()) {
      await module.shutdown?.();
      this.loadedModules.delete(module.name);
    }
  }

  public list(): RegisteredModuleInfo[] {
    return [...this.modules.values()].map((module) => ({
      name: module.name,
      version: module.version,
      description: module.description,
      loaded: this.loadedModules.has(module.name),
    }));
  }
}

export const moduleRegistry = new ModuleRegistry();
