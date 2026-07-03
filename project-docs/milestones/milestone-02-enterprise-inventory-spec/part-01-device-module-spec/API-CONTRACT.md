# Device API Contract

Base path:

```txt
/api/v1/devices
```

## Create Device

```http
POST /api/v1/devices
```

Request:

```json
{
  "name": "CCR2004 Main",
  "host": "192.168.88.1",
  "port": 8728,
  "username": "admin",
  "password": "secret",
  "useTls": false,
  "loginMode": "auto",
  "tags": ["main", "core"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "device-id",
    "name": "CCR2004 Main",
    "host": "192.168.88.1",
    "port": 8728,
    "useTls": false,
    "loginMode": "auto",
    "status": "unknown"
  }
}
```

## List Devices

```http
GET /api/v1/devices
```

## Get Device

```http
GET /api/v1/devices/:id
```

## Update Device

```http
PATCH /api/v1/devices/:id
```

## Delete Device

```http
DELETE /api/v1/devices/:id
```

## Test Device Connection

```http
POST /api/v1/devices/test
```

Request:

```json
{
  "host": "192.168.88.1",
  "port": 8728,
  "username": "admin",
  "password": "secret",
  "useTls": false,
  "loginMode": "auto",
  "timeoutMs": 10000
}
```

Success:

```json
{
  "success": true,
  "data": {
    "online": true,
    "identity": "CCR2004",
    "version": "7.15.3",
    "uptime": "1d2h3m",
    "cpuLoad": 4,
    "freeMemory": 123456789,
    "responseTimeMs": 12
  }
}
```

Failure:

```json
{
  "success": true,
  "data": {
    "online": false,
    "code": "ROUTEROS_AUTH_FAILED",
    "reason": "Authentication failed",
    "responseTimeMs": 51
  }
}
```
