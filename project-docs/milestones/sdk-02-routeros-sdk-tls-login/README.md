# SDK-02 — TLS and Login Hardening

## RouterOS setup

Plain API:

```routeros
/ip service enable api
/ip service set api port=8728
```

API-SSL:

```routeros
/ip service enable api-ssl
/ip service set api-ssl port=8729
```

If you use a self-signed certificate, the SDK defaults to `rejectUnauthorized: false` for local development.

## Probe commands

```powershell
pnpm --filter @mme/routeros-sdk probe -- --host 10.0.0.9 --user admin --pass "PASSWORD"
pnpm --filter @mme/routeros-sdk probe -- --host 10.0.0.9 --port 8729 --tls --user admin --pass "PASSWORD"
```
