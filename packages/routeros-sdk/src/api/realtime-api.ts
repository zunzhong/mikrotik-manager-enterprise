import type { CommandRunner } from '../core/command-runner.js';
import { mapRealtimeTraffic } from '../mappers/realtime.mapper.js';
import type {
  RouterOsLteMonitor,
  RouterOsRealtimeTrafficSample,
  RouterOsWirelessRegistration,
} from '../models/realtime.js';
import { poll, type PollingOptions } from '../utils/polling.js';

export class RealtimeApi {
  public constructor(private readonly runner: CommandRunner) {}
  public async interfaceTraffic(interfaceName: string): Promise<RouterOsRealtimeTrafficSample[]> {
    const rows = await this.runner.print('/interface/monitor-traffic', {
      attributes: { interface: interfaceName, once: true },
    });
    return rows.map(mapRealtimeTraffic);
  }
  public watchInterfaceTraffic(
    interfaceName: string,
    onData: (samples: RouterOsRealtimeTrafficSample[]) => void,
    options: PollingOptions = {},
  ): Promise<void> {
    return poll(() => this.interfaceTraffic(interfaceName), onData, {
      intervalMs: options.intervalMs ?? 1000,
      signal: options.signal,
      onError: options.onError,
    });
  }
  public lteMonitor(interfaceName: string): Promise<RouterOsLteMonitor[]> {
    return this.runner.print('/interface/lte/monitor', {
      attributes: { numbers: interfaceName, once: true },
      timeoutMs: 15000,
    }) as Promise<RouterOsLteMonitor[]>;
  }
  public wirelessRegistration(): Promise<RouterOsWirelessRegistration[]> {
    return this.runner.print('/interface/wireless/registration-table/print') as Promise<
      RouterOsWirelessRegistration[]
    >;
  }
  public wifiRegistration(): Promise<RouterOsWirelessRegistration[]> {
    return this.runner.print('/interface/wifi/registration-table/print') as Promise<
      RouterOsWirelessRegistration[]
    >;
  }
}
