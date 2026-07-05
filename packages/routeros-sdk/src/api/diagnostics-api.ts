import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsBandwidthTestResult,
  RouterOsPingResult,
  RouterOsTorchEntry,
  RouterOsTracerouteHop,
} from '../models/diagnostics.js';

export class DiagnosticsApi {
  public constructor(private readonly runner: CommandRunner) {}

  public ping(input: {
    address: string;
    count?: string | number;
    interval?: string;
    size?: string | number;
  }): Promise<RouterOsPingResult[]> {
    return this.runner.print('/ping', {
      attributes: {
        address: input.address,
        count: input.count ?? 4,
        interval: input.interval,
        size: input.size,
      },
      timeoutMs: 15000,
    }) as Promise<RouterOsPingResult[]>;
  }

  public traceroute(input: {
    address: string;
    count?: string | number;
    timeout?: string;
  }): Promise<RouterOsTracerouteHop[]> {
    return this.runner.print('/tool/traceroute', {
      attributes: {
        address: input.address,
        count: input.count,
        timeout: input.timeout,
      },
      timeoutMs: 30000,
    }) as Promise<RouterOsTracerouteHop[]>;
  }

  public torch(input: {
    interface: string;
    srcAddress?: string;
    dstAddress?: string;
    port?: string | number;
    protocol?: string;
    durationSeconds?: number;
  }): Promise<RouterOsTorchEntry[]> {
    return this.runner.print('/tool/torch', {
      attributes: {
        interface: input.interface,
        srcAddress: input.srcAddress,
        dstAddress: input.dstAddress,
        port: input.port,
        protocol: input.protocol,
        once: true,
      },
      timeoutMs: (input.durationSeconds ?? 5) * 1000,
    }) as Promise<RouterOsTorchEntry[]>;
  }

  public bandwidthTest(input: {
    address: string;
    user?: string;
    password?: string;
    direction?: string;
    duration?: string;
    protocol?: string;
  }): Promise<RouterOsBandwidthTestResult[]> {
    return this.runner.print('/tool/bandwidth-test', {
      attributes: {
        address: input.address,
        user: input.user,
        password: input.password,
        direction: input.direction,
        duration: input.duration,
        protocol: input.protocol,
      },
      timeoutMs: 30000,
    }) as Promise<RouterOsBandwidthTestResult[]>;
  }
}
