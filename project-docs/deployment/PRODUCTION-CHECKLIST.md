# Production Checklist

## Required

- Change `ENCRYPTION_KEY`
- Change PostgreSQL password
- Configure persistent volumes
- Put backend behind HTTPS reverse proxy
- Restrict RouterOS API access by source IP
- Enable API-SSL where possible
- Configure backup storage path
- Confirm CI workflow passes

## Recommended

- Use external managed PostgreSQL
- Use external Redis
- Add monitoring
- Configure log rotation
- Configure daily database backup
- Restrict GHCR image access if private
