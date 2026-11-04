# REST API Reference

The ProtoFlow backend is an Express application backed by SQLite (via `better-sqlite3`). It provides authentication, device management, measurement storage, alert rules, actuator commands, and push notifications.

All endpoints are prefixed with `/api/`. Authenticated endpoints require a JWT Bearer token in the `Authorization` header.

---

## Authentication

All protected endpoints expect the following header:

```
Authorization: Bearer <token>
```

Tokens are obtained from `POST /api/auth/login` and do not expire by default (configurable in the backend source).

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| `400` | Bad Request | Missing required fields, invalid input |
| `401` | Unauthorized | Missing or expired JWT token |
| `403` | Forbidden | Valid token but no access to this resource |
| `404` | Not Found | Device, user, or resource doesn't exist |
| `409` | Conflict | Duplicate email on register, device already claimed |
| `500` | Server Error | Unexpected backend error (check server logs) |

The frontend `api.js` client automatically extracts the error message and throws it:

```javascript
try {
  await api.post('/devices', { uuid: 'invalid' });
} catch (err) {
  console.error(err.message); // "Device not found"
  console.error(err.status);  // 404
}
```

---

## Auth Endpoints

### POST /api/auth/register

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Jane Doe"
}
```

**Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

### POST /api/auth/login

Authenticate and receive a JWT.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

### GET /api/auth/me

Return the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "Jane Doe",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

---

## Device Endpoints

### GET /api/devices

List all devices the authenticated user owns or has been granted access to.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
[
  {
    "id": 1,
    "uuid": "C10B65F4-413F-4C3B-BE3F-000000013825",
    "name": "Living Room Sensor",
    "type": "ESP32",
    "owner_id": 1,
    "public": 0,
    "settings": null,
    "status": "registered",
    "last_seen": "2024-01-15T12:00:00.000Z",
    "created_at": "2024-01-10T08:00:00.000Z"
  }
]
```

### POST /api/devices

Claim an unclaimed device by its UUID. The device must have already connected to NodeRED and been recorded via the webhook.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "uuid": "C10B65F4-413F-4C3B-BE3F-000000013825",
  "name": "Living Room Sensor"
}
```

**Response (201):**

```json
{
  "id": 1,
  "uuid": "C10B65F4-413F-4C3B-BE3F-000000013825",
  "name": "Living Room Sensor",
  "type": "ESP32",
  "owner_id": 1
}
```

### GET /api/devices/:id

Get details for a specific device. Requires ownership or shared access.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Single device object (same shape as list items).

### PATCH /api/devices/:id

Update device name or settings. Owner only.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "name": "Kitchen Sensor",
  "settings": { "display_mode": "compact" }
}
```

**Response (200):** Updated device object.

### DELETE /api/devices/:id

Delete a device and all associated data. Owner only.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{ "message": "Device deleted" }
```

---

## Sharing Endpoints

### GET /api/devices/:id/users

List all users who have access to a device (owner and shared users).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
[
  {
    "user_id": 1,
    "email": "owner@example.com",
    "name": "Jane Doe",
    "role": "owner"
  },
  {
    "user_id": 2,
    "email": "teammate@example.com",
    "name": "John Smith",
    "role": "viewer"
  }
]
```

### POST /api/devices/:id/users

Invite a user to access a device by email. Owner only.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "email": "teammate@example.com",
  "role": "viewer"
}
```

**Response (201):**

```json
{ "message": "User added" }
```

### DELETE /api/devices/:id/users/:userId

Remove a user's access to a device. Owner only.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{ "message": "User removed" }
```

---

## Measurement Endpoints

### GET /api/measurements/:deviceId

Retrieve historical measurement data for a device. Requires ownership or shared access. Public devices allow unauthenticated reads.

**Headers:** `Authorization: Bearer <token>` (optional for public devices)

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sensor` | string | Filter by sensor name (e.g., `slider`) |
| `from` | ISO 8601 | Start of time range |
| `to` | ISO 8601 | End of time range |
| `limit` | integer | Maximum number of rows (default varies) |

**Response (200):**

```json
[
  {
    "id": 42,
    "sensor_name": "slider",
    "value": 57.41,
    "value_json": null,
    "measured_at": "2024-01-15T12:00:00.000Z",
    "received_at": "2024-01-15T12:00:00.100Z"
  }
]
```

### GET /api/measurements/:deviceId/latest

Get the most recent reading for each sensor on a device.

**Headers:** `Authorization: Bearer <token>` (optional for public devices)

**Response (200):**

```json
[
  {
    "sensor_name": "slider",
    "value": 57.41,
    "value_json": null,
    "measured_at": "2024-01-15T12:00:00.000Z"
  },
  {
    "sensor_name": "temperature",
    "value": 24.5,
    "value_json": null,
    "measured_at": "2024-01-15T12:00:00.000Z"
  }
]
```

---

## Alert Endpoints

### GET /api/devices/:id/alerts

List all alert rules for a device.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
[
  {
    "id": 1,
    "device_id": 1,
    "user_id": 1,
    "sensor_name": "temperature",
    "operator": "gt",
    "threshold": 30.0,
    "enabled": 1,
    "last_triggered_at": null,
    "created_at": "2024-01-15T10:00:00.000Z"
  }
]
```

### POST /api/devices/:id/alerts

Create a new alert rule.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "sensor_name": "temperature",
  "operator": "gt",
  "threshold": 30.0
}
```

The `operator` field accepts: `gt` (greater than), `lt` (less than), `gte` (greater than or equal), `lte` (less than or equal), `eq` (equal).

**Response (201):** Created alert rule object.

### PATCH /api/alerts/:id

Update an alert rule (e.g., change threshold or toggle enabled state).

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "threshold": 35.0,
  "enabled": 1
}
```

**Response (200):** Updated alert rule object.

### DELETE /api/alerts/:id

Delete an alert rule.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{ "message": "Alert rule deleted" }
```

### GET /api/alerts/:id/history

Retrieve the trigger history for an alert rule.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
[
  {
    "id": 1,
    "rule_id": 1,
    "value": 31.2,
    "triggered_at": "2024-01-15T14:30:00.000Z"
  }
]
```

---

## Command Endpoints

### POST /api/commands/send

Send an actuator command to a device through the backend. The backend validates authentication and device access, then forwards the command to NodeRED, which relays it to the ESP32.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "deviceId": 1,
  "actuator": "servo",
  "value": 90
}
```

> **Note**: The `deviceId` field is the numeric database ID (from `GET /api/devices`), not the device UUID. The backend looks up the UUID internally before forwarding to NodeRED.

**Response (200):**

```json
{ "message": "Command sent" }
```

The backend sends the command to NodeRED via `POST http://localhost:1880/device-command`. This is the recommended path for backend-triggered automation (scheduled tasks, alert responses, external API integrations).

---

## Push Notification Endpoints

Push notifications use the Web Push protocol with VAPID keys. When an alert rule triggers, the backend sends push notifications to all subscribed browsers for that user.

### GET /api/push/vapid-key

Get the server's VAPID public key for push subscription. No authentication required.

**Response (200):**

```json
{
  "vapidPublicKey": "BEl62iUYgU..."
}
```

### POST /api/push/subscribe

Save a push subscription for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcR...",
    "auth": "tBHI..."
  }
}
```

**Response (201):**

```json
{ "message": "Subscription saved" }
```

### DELETE /api/push/subscribe

Remove a push subscription.

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response (200):**

```json
{ "message": "Subscription removed" }
```

### POST /api/push/test

Send a test push notification to verify the subscription works.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{ "message": "Test notification sent" }
```

---

## Webhook Endpoint

### POST /api/webhook/sensor-data

Internal endpoint called by NodeRED to ingest sensor data. This endpoint does not require authentication -- it is intended for server-to-server communication only (NodeRED to backend on `localhost`).

**Request:**

```json
{
  "device": "C10B65F4-413F-4C3B-BE3F-000000013825",
  "sensor": "slider",
  "value": 57.41,
  "timestamp": 1672531200000
}
```

**Behavior:**

1. Stores the measurement in the `measurements` table
2. Updates the device's `last_seen` timestamp
3. Evaluates all enabled alert rules for this device and sensor
4. Sends push notifications if any thresholds are crossed

**Response (200):**

```json
{ "message": "OK" }
```

---

## Health Check

### GET /api/health

Returns server status. No authentication required.

**Response (200):**

```json
{ "status": "ok" }
```

---

## Database Schema

The backend uses SQLite with the following 7 tables (6 data tables + 1 for push subscriptions). The database file auto-creates at `data/protoflow.db` on first startup.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'ESP32',
    owner_id INTEGER REFERENCES users(id),
    public INTEGER DEFAULT 0,
    settings JSON,
    status TEXT DEFAULT 'registered',
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE device_users (
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer',
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (device_id, user_id)
);

CREATE TABLE measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER REFERENCES devices(id),
    sensor_name TEXT NOT NULL,
    value REAL,
    value_json JSON,
    measured_at DATETIME NOT NULL,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_measurements_device_time
    ON measurements(device_id, measured_at);
CREATE INDEX idx_measurements_device_sensor
    ON measurements(device_id, sensor_name, measured_at);

CREATE TABLE alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sensor_name TEXT NOT NULL,
    operator TEXT NOT NULL CHECK(operator IN ('gt', 'lt', 'gte', 'lte', 'eq')),
    threshold REAL NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_triggered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER REFERENCES alert_rules(id) ON DELETE CASCADE,
    value REAL NOT NULL,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Notes

- **`devices.public`**: When set to `1`, measurement reads skip authentication, allowing public dashboards.
- **`devices.settings`**: Freeform JSON column for product-specific configuration (display preferences, thresholds, custom metadata).
- **`device_users.role`**: Currently supports `"viewer"`. The owner is tracked via `devices.owner_id`, not this table.
- **`measurements.value_json`**: Used for complex sensor data (IMU, GPS, environmental) that cannot be represented as a single `REAL` value.
- **`alert_rules.operator`**: Constrained to `gt`, `lt`, `gte`, `lte`, `eq` via SQL CHECK.

---

## See Also

- [Protocol Reference](./protocol.md) -- compact protocol and message formats
- [JavaScript Client API](./javascript-api.md) -- `protoflow.js` WebSocket client
- [Architecture Overview](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/architecture.md) -- five-layer system design
- [Getting Started](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/getting-started.md) -- end-to-end setup tutorial
