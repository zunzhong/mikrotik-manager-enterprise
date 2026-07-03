# RouterOS Compatibility Matrix

## Supported RouterOS Versions

| RouterOS | API 8728 | API-SSL 8729 | Login Mode | Priority |
|---|---:|---:|---|---|
| 6.49.x | yes | yes | challenge / legacy compatible | high |
| 7.1+ | yes | yes | modern username/password | high |
| 7.10+ | yes | yes | modern username/password | high |

## API Services

Required RouterOS services:

```routeros
/ip service print
/ip service enable api
/ip service enable api-ssl
```

Default ports:

```txt
api     8728
api-ssl 8729
```

## Compatibility Goals

- Plain API must work first.
- API-SSL must be supported after plain API command pipeline is stable.
- SDK must return clear errors for:
  - connection refused
  - timeout
  - authentication failed
  - API disabled
  - TLS handshake failure
  - protocol parse error
