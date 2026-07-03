export interface CollectorPlan {
  key: string;
  name: string;
  description: string;
  jobType: string;
  concurrency: number;
  timeoutMs: number;
  retry: number;
}

export const collectorPlans: CollectorPlan[] = [
  {
    key: 'inventory.full',
    name: 'Full Inventory Collection',
    description: 'Collects enterprise inventory sections from RouterOS.',
    jobType: 'collector.inventory.full',
    concurrency: 5,
    timeoutMs: 60000,
    retry: 2,
  },
  {
    key: 'inventory.quick',
    name: 'Quick Inventory Collection',
    description: 'Collects fast system and resource inventory.',
    jobType: 'collector.inventory.quick',
    concurrency: 10,
    timeoutMs: 15000,
    retry: 1,
  },
];
