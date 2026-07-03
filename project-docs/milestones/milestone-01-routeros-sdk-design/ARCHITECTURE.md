# RouterOS SDK Architecture

## Package

```txt
packages/routeros-core
```

Public package name:

```txt
@mme/routeros-core
```

## Layers

```txt
RouterClient
  ↓
ConnectionManager
  ↓
CommandPipeline
  ↓
AuthenticationService
  ↓
SentenceCodec
  ↓
Transport
  ↓
TCP / TLS
```

## Folder Design

```txt
packages/routeros-core/src
├── client/
├── connection/
├── transport/
├── protocol/
├── auth/
├── command/
├── stream/
├── queue/
├── buffer/
├── pool/
├── errors/
├── testing/
└── index.ts
```

## Principles

- No direct `process.env` usage.
- No direct `console.log`.
- No external RouterOS npm client.
- Public API must be stable and small.
- Internal modules can evolve.
- All protocol behavior must be unit-tested.
