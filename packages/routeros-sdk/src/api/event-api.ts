import { attribute, tag as tagWord } from '../codec/sentence.js';
import { tagGenerator } from '../core/tag-generator.js';
import { mapListenReply } from '../mappers/event.mapper.js';
import type { RouterOsEvent, RouterOsSubscription } from '../models/events.js';
import type { RouterOsReply } from '../protocol/reply.js';
import type { RouterOsTransport } from '../transport/transport.types.js';

export interface ListenOptions {
  tag?: string;
  attributes?: Record<string, string | number | boolean | undefined | null>;
}

export class EventApi {
  public constructor(private readonly transport: RouterOsTransport) {}

  public async listen(
    path: string,
    onEvent: (event: RouterOsEvent) => void,
    options: ListenOptions = {},
  ): Promise<RouterOsSubscription> {
    if (!this.transport.onReply) {
      throw new Error('Current RouterOS transport does not support streaming replies');
    }

    const tag = options.tag ?? tagGenerator.next('listen');
    const attributes = Object.entries(options.attributes ?? {})
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => attribute(key, value as string | number | boolean));

    const unsubscribe = this.transport.onReply((reply: RouterOsReply) => {
      if (reply.tag !== tag) return;
      if (reply.type !== '!re') return;
      onEvent(mapListenReply(path, tag, reply));
    });

    await this.transport.send([`${path}/listen`, ...attributes, tagWord(tag)]);

    return {
      tag,
      path,
      close: async () => {
        unsubscribe();
        await this.transport.send(['/cancel', attribute('tag', tag)]);
      },
    };
  }

  public listenInterfaces(onEvent: (event: RouterOsEvent) => void): Promise<RouterOsSubscription> {
    return this.listen('/interface', onEvent);
  }

  public listenDhcpLeases(onEvent: (event: RouterOsEvent) => void): Promise<RouterOsSubscription> {
    return this.listen('/ip/dhcp-server/lease', onEvent);
  }

  public listenFirewallAddressList(onEvent: (event: RouterOsEvent) => void): Promise<RouterOsSubscription> {
    return this.listen('/ip/firewall/address-list', onEvent);
  }

  public listenLogs(onEvent: (event: RouterOsEvent) => void): Promise<RouterOsSubscription> {
    return this.listen('/log', onEvent);
  }
}
