# SDK-15 — Enterprise Batch & Transaction Engine

Usage:

```ts
const plan = new BatchPlanBuilder('plan-1', 'Provision VLAN')
  .command({
    path: '/interface/vlan/add',
    attributes: { name: 'vlan10', interface: 'bridge', vlanId: 10 },
    rollback: {
      id: 'rollback-vlan10',
      path: '/interface/vlan/remove',
      attributes: { numbers: 'vlan10' },
    },
  })
  .build();

const result = await client.enterprise.runBatch(plan);
```
