# Session Management

## Features

- Access token
- Refresh token
- Session record in database
- Token hash storage
- Session listing
- Revoke one session
- Logout all sessions

## Schema note

Add `sessions Session[]` to `User` and add the `Session` model from `apps/server/prisma/session-model.prisma`.
