import type { CommandRunner } from '../core/command-runner.js';
import { mapBandwidthTestResult, mapPingResult, mapTorchEntry, mapTracerouteHop } from '../mappers/diagnostics.mapper.js';
import type { RouterOsBandwidthTestResult, RouterOsPingResult, RouterOsTorchEntry, RouterOsTracerouteHop } from '../models/diagnostics.js';

export class DiagnosticsApi {
  public constructor(private readonly runner: CommandRunner) {}
  public async ping(input: { address: string; count?: string | number; interval?: string; size?: string | number }): Promise<RouterOsPingResult[]> {
    const rows = await this.runner.print('/ping', { attributes: { address: input.address, count: input.count ?? 4, interval: input.interval, size: input.size }, timeoutMs: 15000 });
    return rows.map(mapPingResult);
  }
  public async traceroute(input: { address: string; count?: string | number; timeout?: string }): Promise<RouterOsTracerouteHop[]> {
    const rows = await this.runner.print('/tool/traceroute', { attributes: { address: input.address, count: input.count, timeout: input.timeout }, timeoutMs: 30000 });
    return rows.map(mapTracerouteHop);
  }
  public async torch(input: { interface: string; srcAddress?: string; dstAddress?: string; port?: string | number; protocol?: string; durationSeconds?: number }): Promise<RouterOsTorchEntry[]> {
    const rows = await this.runner.print('/tool/torch', { attributes: { interface: input.interface, srcAddress: input.srcAddress, dstAddress: input.dstAddress, port: input.port, protocol: input.protocol, once: true }, timeoutMs: (input.durationSeconds ?? 5) * 1000 });
    return rows.map(mapTorchEntry);
  }
  public async bandwidthTest(input: { address: string; user?: string; password?: string; direction?: string; duration?: string; protocol?: string }): Promise<RouterOsBandwidthTestResult[]> {
    const rows = await this.runner.print('/tool/bandwidth-test', { attributes: { address: input.address, user: input.user, password: input.password, direction: input.direction, duration: input.duration, protocol: input.protocol }, timeoutMs: 30000 });
    return rows.map(mapBandwidthTestResult);
  }
}
