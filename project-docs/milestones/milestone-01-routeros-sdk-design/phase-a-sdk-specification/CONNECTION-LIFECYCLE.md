# Connection Lifecycle

## States

```txt
idle
connecting
connected
authenticating
authenticated
closing
closed
error
```

## Rules

- Initial state is `idle`.
- TCP connected state is not authenticated.
- Commands require `authenticated`.
- `close()` is idempotent.
- Socket close rejects all pending commands.
- Reconnect creates a new transport instance.
- `RouterClient` should not reuse a broken socket.

## Events

```ts
client.on('state', (state) => {})
client.on('connect', () => {})
client.on('authenticated', () => {})
client.on('close', () => {})
client.on('error', (error) => {})
```
