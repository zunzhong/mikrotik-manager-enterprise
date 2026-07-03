# Command Lifecycle Specification

## Command Request

A command consists of:

```ts
interface CommandRequest {
  path: string;
  attributes?: Record<string, string | number | boolean>;
  queries?: string[];
  tag?: string;
  timeoutMs?: number;
}
```

Example:

```ts
await client.command('/system/resource/print', {
  '.proplist': 'version,uptime,cpu-load'
});
```

## RouterOS Sentence

Outbound sentence:

```txt
/system/resource/print
=.proplist=version,uptime,cpu-load
.tag=req-1
<zero length word>
```

## Reply Lifecycle

```txt
send command
  ↓
receive !re rows
  ↓
receive !done
  ↓
resolve promise
```

## Error Lifecycle

```txt
send command
  ↓
receive !trap
  ↓
reject with RouterOsCommandError
```

## Fatal Lifecycle

```txt
receive !fatal
  ↓
connection state = error
  ↓
reject all pending commands
  ↓
close transport
```
