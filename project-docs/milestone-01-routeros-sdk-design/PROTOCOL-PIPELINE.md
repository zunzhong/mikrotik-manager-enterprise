# RouterOS Protocol Pipeline

## Outbound

```txt
CommandRequest
  ↓
Sentence[]
  ↓
SentenceEncoder
  ↓
LengthEncoder
  ↓
Buffer
  ↓
Transport.write()
```

## Inbound

```txt
Transport data chunk
  ↓
AsyncQueue<Buffer>
  ↓
ByteBuffer
  ↓
LengthDecoder
  ↓
SentenceDecoder
  ↓
ReplyParser
  ↓
CommandPipeline resolver
```
