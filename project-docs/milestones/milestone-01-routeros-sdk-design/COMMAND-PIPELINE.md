# Command Pipeline

## Goal

Multiple commands may run concurrently. RouterOS uses `.tag` to associate responses.

## Flow

```txt
command('/system/resource/print')
  ↓
generate tag req-1
  ↓
send sentence with .tag=req-1
  ↓
collect !re replies
  ↓
resolve when !done for req-1 arrives
```

## Reply Types

- `!re`: data row
- `!done`: command finished
- `!trap`: command error
- `!fatal`: connection-level fatal error
