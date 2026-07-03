# Test Strategy

## Unit Tests

Required:

- Length encoder/decoder
- Sentence encoder/decoder
- ByteBuffer
- AsyncQueue
- Reply parser
- Auth challenge hash
- Command parser

## Integration Tests

Use fake RouterOS API server.

Fake server must support:

- TCP accept
- Modern login success
- Challenge login success
- Auth failure
- Simple command response
- Trap response
- Split TCP chunks
- Delayed response
- Timeout simulation
