import { auditService } from '../audit/index.js';
import { rbacService } from './rbac.service.js';

let startupSeedPromise: Promise<void> | null = null;

export async function seedRbacDefaultsOnStartup(): Promise<void> {
  if (!startupSeedPromise) {
    startupSeedPromise = rbacService.seedDefaults();
  }

  return startupSeedPromise;
}

export async function seedRbacDefaultsWithAudit(actorId = 'rbac-bootstrap'): Promise<{
  seeded: true;
  generatedAt: string;
}> {
  await seedRbacDefaultsOnStartup();

  const result = {
    seeded: true as const,
    generatedAt: new Date().toISOString(),
  };

  await auditService.logSuccess({
    action: 'rbac.defaults.seeded',
    summary: 'RBAC default roles and permissions seeded',
    actor: {
      type: 'system',
      id: actorId,
      name: actorId,
    },
    entity: {
      type: 'config',
      id: 'rbac-defaults',
      name: 'RBAC Defaults',
    },
    metadata: {
      result,
    },
  });

  return result;
}

export function resetRbacStartupSeedForTests(): void {
  startupSeedPromise = null;
}
