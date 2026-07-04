# Auth Seeding

Create default admin:

```powershell
pnpm --filter @mme/server prisma:seed
```

Default credentials:

```txt
admin@example.com
admin
```

Optional override:

```env
DEFAULT_ADMIN_EMAIL=admin@company.com
DEFAULT_ADMIN_PASSWORD=strong-password
```
