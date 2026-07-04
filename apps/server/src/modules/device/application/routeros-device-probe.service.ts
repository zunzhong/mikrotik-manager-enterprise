import type {
  RouterOsConnectionInput,
  RouterOsProbeResult,
} from '../domain/routeros-connection.types.js';
import { routerOsSdkAdapter } from '../infrastructure/routeros-sdk.adapter.js';

function firstRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return (value[0] ?? {}) as Record<string, unknown>;
  }

  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export class RouterOsDeviceProbeService {
  public async probe(input: RouterOsConnectionInput): Promise<RouterOsProbeResult> {
    const startedAt = Date.now();
    const client = routerOsSdkAdapter.createClient(input);

    try {
      await routerOsSdkAdapter.connect(client);

      const [identityRaw, resourceRaw, routerboardRaw] = await Promise.allSettled([
        routerOsSdkAdapter.run(client, '/system/identity/print'),
        routerOsSdkAdapter.run(client, '/system/resource/print'),
        routerOsSdkAdapter.run(client, '/system/routerboard/print'),
      ]);

      const identity = identityRaw.status === 'fulfilled' ? firstRecord(identityRaw.value) : {};
      const resource = resourceRaw.status === 'fulfilled' ? firstRecord(resourceRaw.value) : {};
      const routerboard = routerboardRaw.status === 'fulfilled' ? firstRecord(routerboardRaw.value) : {};

      return {
        online: true,
        latencyMs: Date.now() - startedAt,
        identity: stringValue(identity.name),
        version: stringValue(resource.version),
        architecture: stringValue(resource.architectureName ?? resource['architecture-name']),
        boardName: stringValue(routerboard.model ?? resource.boardName ?? resource['board-name']),
        serialNumber: stringValue(routerboard.serialNumber ?? routerboard['serial-number']),
        raw: {
          identity,
          resource,
          routerboard,
        },
      };
    } catch (error) {
      return {
        online: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'RouterOS probe failed',
      };
    } finally {
      await routerOsSdkAdapter.close(client).catch(() => undefined);
    }
  }
}

export const routerOsDeviceProbeService = new RouterOsDeviceProbeService();
