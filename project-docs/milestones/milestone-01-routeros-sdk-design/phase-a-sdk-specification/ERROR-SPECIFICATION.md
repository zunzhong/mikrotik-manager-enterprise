# Error Specification

## Base Error

```ts
class RouterOsError extends Error {
  code: string;
  cause?: unknown;
}
```

## Error Codes

| Code                        | Meaning                                     |
| --------------------------- | ------------------------------------------- |
| `ROUTEROS_CONNECTION_ERROR` | TCP/TLS connection failed                   |
| `ROUTEROS_TIMEOUT`          | operation timed out                         |
| `ROUTEROS_PROTOCOL_ERROR`   | invalid or incomplete protocol data         |
| `ROUTEROS_AUTH_FAILED`      | login rejected                              |
| `ROUTEROS_COMMAND_TRAP`     | command returned `!trap`                    |
| `ROUTEROS_FATAL`            | router returned `!fatal`                    |
| `ROUTEROS_CLOSED`           | operation attempted after close             |
| `ROUTEROS_INVALID_STATE`    | command attempted in wrong connection state |

## Error Response for Backend

Backend should map SDK errors to user-readable status:

```json
{
  "online": false,
  "reason": "Authentication failed",
  "code": "ROUTEROS_AUTH_FAILED"
}
```
