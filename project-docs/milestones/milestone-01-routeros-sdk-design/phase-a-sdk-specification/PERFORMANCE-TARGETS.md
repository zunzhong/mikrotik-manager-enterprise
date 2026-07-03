# Performance Targets

## Short-term Targets

- One command roundtrip should avoid unnecessary Buffer copies.
- Decoder must support fragmented TCP chunks.
- Decoder must support multiple sentences in one chunk.
- Command pipeline must support concurrent commands through `.tag`.

## Medium-term Targets

- 100 active RouterOS devices.
- 1-second health polling without event loop blocking.
- Streaming commands should not block normal commands.

## Long-term Targets

- 1000 devices with worker/queue architecture.
- Connection pool with configurable max concurrency.
- Backpressure for streaming commands.
