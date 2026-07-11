# Repo Health Check

This tool validates the repository and automatically fixes formatting.

## Script

```txt
tools/quality/repo-health-check.ps1
```

## Full check

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/quality/repo-health-check.ps1
```

## Skip tests

Use this when workspace tests are not ready.

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/quality/repo-health-check.ps1 `
  -SkipTests
```

## Fast check

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/quality/repo-health-check.ps1 `
  -SkipTests `
  -SkipBuild
```

## What it runs

```txt
pnpm install --frozen-lockfile
pnpm format:check
pnpm format if formatting fails
pnpm --filter @mme/server prisma:format
pnpm --filter @mme/server prisma:generate
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm typecheck
pnpm build
pnpm test
```

## Report

The script writes:

```txt
repo-health-report.txt
```

Review changes before committing:

```powershell
git status
git diff
```
