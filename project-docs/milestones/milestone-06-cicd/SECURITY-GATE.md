# Security Gate

## Current Mode

Security scanning is enabled in report mode:

- `pnpm audit`
- Trivy filesystem scan
- Trivy server image scan
- Trivy web image scan

`continue-on-error` is enabled intentionally during early development.

## Future Hardening

Later, when dependency versions stabilize:

- fail on critical vulnerabilities
- upload SARIF to GitHub Security
- sign release artifacts
- generate SBOM
