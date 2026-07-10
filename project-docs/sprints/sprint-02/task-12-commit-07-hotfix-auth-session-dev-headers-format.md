# Hotfix — Auth Session Dev Headers Format

Fixes Prettier formatting warning in:

```txt
project-docs/security/auth-session-dev-headers.md
```

## Error

```txt
[warn] project-docs/security/auth-session-dev-headers.md
[warn] Code style issues found in the above file.
```

## Fix

Indent fenced code blocks under numbered list items so Prettier accepts the Markdown file.

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
