# Implementation Plan

## Part 02 — Database Foundation

- Add PostgreSQL docker compose
- Add Prisma
- Add Device model
- Add migration
- Add Prisma client wrapper

## Part 03 — Device Module

- Add Device repository
- Add Device service
- Add Device routes
- Add Zod schemas
- Add CRUD API

## Part 04 — Device Test Connection

- Integrate `@mme/routeros-core`
- Add `/api/v1/devices/test`
- Normalize RouterOS resource output
- Return clear errors

## Part 05 — Device Status Worker

- Poll device status
- Persist last seen
- Persist last error
