# Backup & Restore Notes

## Application Backup

Back up:

- PostgreSQL database
- `BACKUP_STORAGE_DIR`
- `.env`
- Docker Compose file
- GHCR image tags used in production

## PostgreSQL Backup

```bash
pg_dump "$DATABASE_URL" > mme-db.sql
```

## Restore

```bash
psql "$DATABASE_URL" < mme-db.sql
```

## RouterOS Backups

RouterOS backup/export metadata is stored in the database.
Physical transfer from RouterOS files will be expanded in a future milestone.
