# SDK-19 — Audit, Compliance & Policy Engine

Usage:

```ts
const report = await client.compliance.run();
console.log(report.score, report.findings);
```

Built-in baseline rules:

- Telnet disabled
- API disabled/restricted
- Default admin reviewed
- Firewall has drop rule
```
