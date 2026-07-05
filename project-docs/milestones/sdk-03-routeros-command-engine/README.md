# SDK-03 — RouterOS Command Engine

Added typed APIs:

```ts
client.system.identity()
client.system.resource()
client.system.routerboard()

client.interfaces.list()
client.interfaces.get(id)
client.interfaces.enable(id)
client.interfaces.disable(id)

client.ip.address.list()
client.ip.address.add(...)
client.ip.address.remove(id)

client.ip.route.list()
```
