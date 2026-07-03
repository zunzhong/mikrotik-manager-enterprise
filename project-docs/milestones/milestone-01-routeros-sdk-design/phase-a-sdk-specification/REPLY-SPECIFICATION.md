# Reply Specification

## RouterOS Reply Types

| Reply | Meaning |
|---|---|
| `!re` | data row |
| `!done` | command finished |
| `!trap` | command-level error |
| `!fatal` | connection-level fatal error |

## Raw Reply Example

```txt
!re
=version=7.15.3
=uptime=1d2h3m
=cpu-load=4
.tag=req-1

!done
.tag=req-1
```

## Parsed Reply

```ts
interface RouterReply {
  type: 're' | 'done' | 'trap' | 'fatal';
  words: Record<string, string>;
  tag?: string;
  raw: string[];
}
```

## Attribute Parsing Rules

| Raw Word | Parsed |
|---|---|
| `=name=value` | `{ name: 'value' }` |
| `.tag=req-1` | `tag = 'req-1'` |
| `!done` | `type = 'done'` |
| `!re` | `type = 're'` |

## Notes

- `.tag` is not a normal attribute.
- `!trap` should expose `message`, `category`, and raw words.
- Unknown words must be preserved in `raw`.
