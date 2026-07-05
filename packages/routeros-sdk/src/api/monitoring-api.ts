import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsHealth, RouterOsInterfaceTraffic, RouterOsSystemClock } from '../models/monitoring.js';

export class MonitoringApi {
  public constructor(private readonly runner: CommandRunner) {}

  public interfaceTraffic(interfaceName: string): Promise<RouterOsInterfaceTraffic[]> {
    return this.runner.print('/interface/monitor-traffic', {
      attributes: {
        interface: interfaceName,
        once: true,
      },
    }) as Promise<RouterOsInterfaceTraffic[]>;
  }

  public health(): Promise<RouterOsHealth[]> {
    return this.runner.print('/system/health/print') as Promise<RouterOsHealth[]>;
  }

  public clock(): Promise<RouterOsSystemClock> {
    return this.runner.printOne('/system/clock/print') as Promise<RouterOsSystemClock>;
  }
}
