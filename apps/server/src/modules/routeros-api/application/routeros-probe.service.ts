import type {
  RouterOsApiConnectionInput,
  RouterOsApiProbeResult,
} from '../domain/routeros-api.types.js';
import { RouterOsApiClient, type RouterOsReply } from '../infrastructure/routeros-api-client.js';

function firstData(replies: RouterOsReply[]): RouterOsReply {
  return replies.find((reply) => reply['!type'] === '!re') ?? {};
}

function value(...values: unknown[]): string | undefined {
  for (const item of values) {
    if (typeof item === 'string' && item.length > 0) return item;
  }
  return undefined;
}

export class RouterOsProbeService {
  public async probe(input: RouterOsApiConnectionInput): Promise<RouterOsApiProbeResult> {
    const startedAt = Date.now();
    const client = new RouterOsApiClient(input);

    try {
      await client.connect();
      await client.login();

      const [identityReplies, resourceReplies, routerboardReplies] = await Promise.all([
        client.command('/system/identity/print'),
        client.command('/system/resource/print'),
        client.command('/system/routerboard/print'),
      ]);

      const identity = firstData(identityReplies);
      const resource = firstData(resourceReplies);
      const routerboard = firstData(routerboardReplies);

      return {
        online: true,
        latencyMs: Date.now() - startedAt,
        identity: value(identity.name),
        version: value(resource.version),
        architecture: value(resource['architecture-name'], resource.architecture),
        boardName: value(routerboard.model, resource['board-name']),
        serialNumber: value(routerboard['serial-number']),
        uptime: value(resource.uptime),
        raw: { identity, resource, routerboard },
      };
    } catch (error) {
      return {
        online: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'RouterOS probe failed',
      };
    } finally {
      client.close();
    }
  }

  public test(input: RouterOsApiConnectionInput): Promise<RouterOsApiProbeResult> {
    return this.probe(input);
  }
}

export const routerOsProbeService = new RouterOsProbeService();
