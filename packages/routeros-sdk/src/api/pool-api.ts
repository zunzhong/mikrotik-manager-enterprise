import { RouterOsSessionPool } from '../core/session-pool.js';
import type {
  RouterOsPoolExecutionResult,
  RouterOsPoolHealth,
  RouterOsPoolTarget,
  RouterOsRetryPolicy,
} from '../models/session-pool.js';
import type { RouterOsClient } from '../client/routeros-client.js';

export class PoolApi {
  private readonly pool: RouterOsSessionPool;

  public constructor(targets: RouterOsPoolTarget[], retryPolicy: RouterOsRetryPolicy = {}) {
    this.pool = new RouterOsSessionPool(targets, retryPolicy);
  }

  public targets(): RouterOsPoolTarget[] {
    return this.pool.listTargets();
  }

  public health(): Promise<RouterOsPoolHealth[]> {
    return this.pool.healthCheckAll();
  }

  public executeOnAll<T>(
    fn: (client: RouterOsClient, target: RouterOsPoolTarget) => Promise<T>,
  ): Promise<Array<RouterOsPoolExecutionResult<T>>> {
    return this.pool.executeOnAll(fn);
  }

  public executeOnFirstHealthy<T>(
    fn: (client: RouterOsClient, target: RouterOsPoolTarget) => Promise<T>,
  ): Promise<RouterOsPoolExecutionResult<T>> {
    return this.pool.executeOnFirstHealthy(fn);
  }

  public close(): Promise<void> {
    return this.pool.disconnectAll();
  }
}
