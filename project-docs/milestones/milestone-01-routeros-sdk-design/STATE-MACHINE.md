# Connection State Machine

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

- Commands can only run in `authenticated`.
- Login can only run in `connected`.
- `close()` can run from any active state.
- Reconnect must create a new transport instance.
