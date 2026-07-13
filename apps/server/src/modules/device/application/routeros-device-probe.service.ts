import type {
  RouterOsConnectionInput,
  RouterOsProbeResult,
} from '../domain/routeros-connection.types.js';
import { routerOsSdkAdapter } from '../infrastructure/routeros-sdk.adapter.js';

function records(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value))
    return value.filter((item) => item && typeof item === 'object') as Record<string, unknown>[];
  if (value && typeof value === 'object') return [value as Record<string, unknown>];
  return [];
}

function firstRecord(value: unknown): Record<string, unknown> {
  return records(value)[0] ?? {};
}

function text(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

export class RouterOsDeviceProbeService {
  public async probe(input: RouterOsConnectionInput): Promise<RouterOsProbeResult> {
    const startedAt = Date.now();
    const client = routerOsSdkAdapter.createClient(input);

    try {
      await routerOsSdkAdapter.connect(client);

      // RouterOS API uses a single ordered sentence stream. Keep commands sequential.
      const identityResult = [];
      for (const path of [
        '/system/identity/print',
        '/system/resource/print',
        '/system/routerboard/print',
      ]) {
        try {
          identityResult.push({
            status: 'fulfilled' as const,
            value: await routerOsSdkAdapter.run(client, path),
          });
        } catch (reason) {
          identityResult.push({ status: 'rejected' as const, reason });
        }
      }

      const identity =
        identityResult[0].status === 'fulfilled' ? firstRecord(identityResult[0].value) : {};
      const resource =
        identityResult[1].status === 'fulfilled' ? firstRecord(identityResult[1].value) : {};
      const routerboard =
        identityResult[2].status === 'fulfilled' ? firstRecord(identityResult[2].value) : {};

      return {
        online: true,
        latencyMs: Date.now() - startedAt,
        identity: text(identity.name, identity.identity),
        version: text(resource.version),
        architecture: text(
          resource.architectureName,
          resource['architecture-name'],
          resource.architecture,
        ),
        boardName: text(
          routerboard.model,
          routerboard.boardName,
          routerboard['board-name'],
          resource.boardName,
          resource['board-name'],
        ),
        serialNumber: text(routerboard.serialNumber, routerboard['serial-number']),
        uptime: text(resource.uptime),
        raw: { identity, resource, routerboard },
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

  public async test(input: RouterOsConnectionInput): Promise<RouterOsProbeResult> {
    return this.probe(input);
  }
}

export const routerOsDeviceProbeService = new RouterOsDeviceProbeService();
