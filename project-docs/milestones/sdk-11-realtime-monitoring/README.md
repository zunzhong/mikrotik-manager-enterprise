# SDK-11 — Realtime Monitoring & Diagnostics

Typed APIs:

```ts
client.realtime.interfaceTraffic('ether1')
client.realtime.watchInterfaceTraffic('ether1', samples => console.log(samples))

client.diagnostics.ping({ address: '8.8.8.8' })
client.diagnostics.traceroute({ address: '8.8.8.8' })
client.diagnostics.torch({ interface: 'ether1' })
client.diagnostics.bandwidthTest({ address: '10.0.0.2' })
```
