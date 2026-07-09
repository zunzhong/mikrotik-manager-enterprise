# SDK-13 — Event Streaming / Listen API

Usage:

```ts
const sub = await client.events.listenInterfaces((event) => {
  console.log(event);
});

await sub.close();
```

High-level helpers:

```ts
client.events.listenInterfaces(...)
client.events.listenDhcpLeases(...)
client.events.listenFirewallAddressList(...)
client.events.listenLogs(...)
```
