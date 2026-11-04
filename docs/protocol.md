# Protocol Reference

ProtoFlow uses a compact text protocol between ESP32 devices and the NodeRED message broker. It keeps messages small on constrained devices, while NodeRED translates them into standard JSON for web clients and the backend API.

This document describes what the code in `broker/flows.json`, `firmware/src/` and `clients/js/protoflow.js` actually does.

## Endpoints

| Endpoint | Who uses it | Purpose |
|----------|-------------|---------|
| `/ws/device` (WebSocket) | ESP32 devices | Registration, heartbeat, sensor data, actuator commands |
| `/ws/app` (WebSocket) | Web clients (`protoflow.js`, starter app) | Device list, subscriptions, live sensor data, actuator commands |
| `POST /device/register` (HTTP) | Battery-powered devices in HTTP mode | Registration without a WebSocket |
| `POST /device/data` (HTTP) | Battery-powered devices in HTTP mode | Batched sensor readings |
| `POST /device-command` (HTTP) | Backend only (internal) | Send an actuator command to a device |

NodeRED identifies a WebSocket device by its **session**, not by a UUID in every message. The UUID is sent once, at registration.

---

## Device Lifecycle

```
ESP32                                   NodeRED
  │── connect /ws/device ─────────────────►│
  │── device_registration (JSON) ─────────►│  stores device + code maps in flow context
  │◄──────────────── registration_ack ─────│  also forwards registration to backend
  │                                        │
  │── h  (every 3.5 s) ───────────────────►│  updates lastHeartbeat
  │── S57.41 / {"s":..,"v":..} ───────────►│  decodes, relays to web clients + backend
  │◄────────────── L1 / {"a":..,"v":..} ───│  actuator command
  │                                        │
  │  (NodeRED restarted, session unknown)  │
  │── h ──────────────────────────────────►│
  │◄────────────── re_register_request ────│
  │── device_registration ────────────────►│
```

The firmware does not send sensor data until it has received `registration_ack`.

### Device Registration (ESP32 → NodeRED)

```json
{
  "type": "device_registration",
  "device": "C10B65F4-413F-4C3B-BE3F-000000013825",
  "device_name": "Grove Slider Demo",
  "device_type": "ESP32",
  "library": "ProtoFlow",
  "version": "1.3.0",
  "timestamp": 21187,
  "ip": "192.168.1.100",
  "sensors": [
    { "name": "slider", "type": "slider", "data_type": "float",
      "min_value": 0.0, "max_value": 100.0, "unit": "percentage", "description": "Analog slider sensor" }
  ],
  "actuators": [
    { "name": "led", "type": "led", "data_type": "boolean", "description": "LED actuator" }
  ]
}
```

- `type` decides the compact code (tables below). `data_type` decides how actuator values are encoded.
- `min_value`/`max_value` are only sent for `float` and `int`. `unit` and `description` are optional.
- Registering again (e.g. after a reboot with different components) replaces the stored sensors, actuators and code maps.

### Registration Acknowledgment (NodeRED → ESP32)

```json
{ "type": "registration_ack", "device": "<UUID>", "status": "accepted",
  "message": "Device registered successfully", "timestamp": 1672531200000 }
```

For a device NodeRED already knows, `message` is `"Device reconnected"`.

### Heartbeat (ESP32 → NodeRED)

The single character `h`, every 3.5 seconds. NodeRED finds the device by session and updates its `lastHeartbeat`. Sensor data also counts as a heartbeat.

### Re-registration Request (NodeRED → ESP32)

Sent when a heartbeat or sensor message arrives from a session NodeRED doesn't know, typically after NodeRED restarts:

```json
{ "type": "re_register_request", "message": "Session not found, please re-register",
  "timestamp": 1672531200000, "reason": "heartbeat_session_not_found" }
```

`reason` is `heartbeat_session_not_found`, `compact_sensor_session_not_found` or `session_lookup_failed`. The firmware responds by sending its registration again.

### Timeouts

| What | Interval / threshold | Where |
|------|---------------------|-------|
| Device heartbeat | every 3.5 s | firmware |
| Health check runs | every 10 s | NodeRED `Connection Monitor` |
| Device marked `stale` | no heartbeat for 15 s | `Connection Health Check` |
| Device removed from registry | no heartbeat for 60 s | `Connection Health Check` |
| Web client ping | every 5 s | `protoflow.js` |
| Web client removed | no ping for 15 s | `PWA Health Check` |

---

## Sensor Data (ESP32 → NodeRED)

### Compact format: `[CODE][VALUE]`

```
S57.41      slider at 57.41
T24.50      temperature 24.5
B1          button pressed
M0          no motion
D-1.00      negative values work too
```

The firmware sends numbers with two decimals. NodeRED decodes the value by code:

| Code | Decoded as |
|------|------------|
| `B`, `M` | boolean (`"1"` → `true`, anything else → `false`) |
| `I` | IMU object (see below) |
| any other | `parseFloat` |

To find the sensor name, NodeRED looks up the device's `sensorCodeMap` for the first sensor with that code. Two sensors with the same code on one device would therefore be indistinguishable, so **the firmware only uses the compact format when a sensor's code is unique on that device.** Otherwise it sends JSON. For example, the thumb joystick registers two `slider` sensors, so both axes are sent as JSON.

### IMU format: `I` + comma-separated values

```
I0.12,-0.05,9.81                                        3-DOF: accel x,y,z
I0.12,-0.05,9.81,0.01,-0.02,0.03                        6-DOF: accel, gyro
I0.12,-0.05,9.81,0.01,-0.02,0.03,23.5,-14.2,41.8        9-DOF: accel, gyro, mag
```

Sent by `sendAccel3DOF`, `sendIMU6DOF` and `sendIMUData`. NodeRED decodes them to `{accel:{x,y,z}}`, `{accel, gyro}` or `{accel, gyro, mag}`. The sensor must be registered with an IMU type (`imu`, `imu_6dof`, `imu_9dof`, `imu_10dof`) so NodeRED can map `I` to its name. Only one IMU per device is supported.

### JSON format

```json
{"s": "gesture", "v": "left"}
{"s": "gps", "v": {"lat": 60.1695, "lng": 24.9354}}
```

Used for sensors whose code is not unique, types without a code, and all `object`/`string` values. `sendSensorData(name, JsonObject)` also adds `"t": millis()`, which NodeRED ignores.

### Sensor Code Table

| Code | Registered `type` | Sent compact by firmware? |
|------|-------------------|---------------------------|
| `A` | analog | yes |
| `S` | slider, potentiometer | yes |
| `T` | temperature | yes |
| `H` | humidity | yes |
| `L` | light, lux | yes |
| `P` | pressure | yes |
| `D` | distance, ultrasonic | yes |
| `B` | button, digital | yes |
| `M` | motion, pir | yes |
| `N` | sound | yes |
| `G` | gas | yes |
| `V` | voltage | yes |
| `C` | current | yes |
| `I` | imu, imu_6dof, imu_9dof, imu_10dof | only via the IMU helpers |
| `Q` | quaternion | no (JSON) |
| `X` | mp3_status | no (JSON) |

Any other type (e.g. `gesture`) has no code and always uses JSON.

---

## Actuator Commands (NodeRED → ESP32)

NodeRED receives commands as JSON (from web clients or the backend) and encodes them for the device. The format depends on the actuator's registered `type` **and** `data_type`:

| `data_type` | Encoding | Example |
|-------------|----------|---------|
| `boolean` | code + `1`/`0`. The strings `"on"`, `"1"`, `"true"` (any case) → `1`, other strings → `0`; any other value → `1` if truthy, so every number except 0 → `1` | `L1` |
| `int`, `float` | code + value | `S90`, `V50.5` |
| `object`, type `rgb_led` | code + `r,g,b` | `R255,128,0` |
| `object`, type `stepper` | code + `steps,direction,speed` | `T200,1,100` |
| `object`, type `tone_buzzer` | code + `frequency,duration` | `Z440,1000` |
| anything else, or a type without a code | JSON `{"a": name, "v": value}` | `{"a":"lcd","v":{"t":"Hi"}}` |

### Actuator Code Table

| Code | Registered `type` |
|------|-------------------|
| `L` | led |
| `P` | pwm_led |
| `S` | servo |
| `M` | dc_motor |
| `R` | rgb_led |
| `B` | buzzer |
| `E` | relay |
| `T` | stepper |
| `F` | fan |
| `V` | valve |
| `H` | heater |
| `Z` | tone_buzzer |
| `W` | pwm |
| `D` | dac |
| `X` | mp3_player (NodeRED only; its `object` values are always sent as JSON) |

The firmware decodes a compact command by finding the **first** actuator whose type maps to that code. Two actuators of the same type on one device (e.g. two `led`s) can't be told apart in compact form.

Most display-type Grove actuators (`display`, `lcd_rgb`, `oled`, `led_bar`, `rgb_strip`, `mp3_player`) use `object` values and therefore always receive JSON.

---

## Web Client Messages (`/ws/app`)

### Client → NodeRED

| `type` | Fields | Effect |
|--------|--------|--------|
| `pwa_registration` | `client_id`, `client_name`, `user_agent` | Registers the client. Required before subscribing |
| `pwa_ping` | `client_id` | Keepalive, every 5 s |
| `get_devices` | — | Replies with `device_list` |
| `get_pwa_clients` | `client_id` | Replies with `pwa_client_list` |
| `subscribe` | `device`, **`client`** | Start receiving that device's sensor data |
| `unsubscribe` | `device`, **`client`** | Stop receiving it |
| `actuator_cmd` or `actuator_command` | `device`, `actuator`, `value` | Send a command (both type names are accepted) |

Note that `subscribe`/`unsubscribe` carry the client ID in a field named `client`, not `client_id`.

### NodeRED → Client

| `type` | Contents |
|--------|----------|
| `pwa_registration_ack` | `client_id`, `status` |
| `device_list` | `devices[]`: `uuid`, `deviceName`, `deviceType`, `status`, `sensors`, `actuators`, `lastSeen`, `ip`, `library`, `version` |
| `subscription_ack` / `unsubscription_ack` | `device`, `client_id`, `status` |
| `pwa_client_list` | `clients[]` with their subscriptions |
| `sensor_data` | see below |

Sensor data goes **only to clients subscribed to that device**:

```json
{ "type": "sensor_data", "device": "<UUID>", "sensor": "slider", "value": 57.41, "timestamp": 1672531200000 }
```

`timestamp` is set by NodeRED when the message arrives (for HTTP devices, the reading's own timestamp if it has one).

---

## Broker ↔ Backend (HTTP)

NodeRED and the backend run on the same server and talk over localhost.

| Direction | Request | Body |
|-----------|---------|------|
| NodeRED → backend | `POST /api/webhook/sensor-data` | `{device, sensor, value, timestamp}`, one per reading |
| NodeRED → backend | `POST /api/webhook/device-register` | `{uuid, name, type, sensors, actuators}` on every registration |
| NodeRED → backend | `GET /api/webhook/verify-device/:uuid` | Used by `/device/data` to check the device is claimed |
| Backend → NodeRED | `POST /device-command` | `{deviceUUID, actuator, value}` |

`/device-command` returns `200 {sent: true, device, actuator, value}`, `400` if a field is missing, or `404` if the device isn't in NodeRED's registry (not connected). The command is then encoded as described under Actuator Commands.

The backend stores each reading (numbers in `value`, objects in `value_json`) and evaluates the device's alert rules, recording triggered alerts in `alert_history`.

## Device HTTP API (battery-powered devices)

For devices that wake up, send, and sleep instead of keeping a WebSocket open.

**`POST /device/register`**, same fields as the WebSocket registration:

```json
{ "device": "<UUID>", "device_name": "Weather Station", "device_type": "ESP32",
  "sensors": [ ... ], "actuators": [ ... ] }
```

Returns `200 {type: "registration_ack", status: "accepted", device}` or `400` if `device` or `device_name` is missing.

**`POST /device/data`**, a batch of readings:

```json
{ "device": "<UUID>", "readings": [
    { "sensor": "temperature", "value": 21.4, "timestamp": 1672531200000 },
    { "sensor": "humidity", "value": 48.0 } ] }
```

Returns `200 {stored: true, count}`, `400` if `readings` is missing or empty, or `403` if the device hasn't been claimed by a user in the backend. Each reading is relayed to subscribed web clients and to the backend exactly like WebSocket data.

HTTP devices send no heartbeat, so NodeRED removes them from its live registry 60 s after registration. Their data keeps flowing, but they disappear from `device_list` and can't receive `/device-command` actuator commands.

---

## Complete Data Flow

### Sensor Data Path

```
ESP32 sends compact data (e.g. S57.41)
  │
  ▼
NodeRED /ws/device
  - finds the device by WebSocket session
  - decodes the code to a sensor name and value
  - adds a server timestamp
  │
  ├──► web clients subscribed to the device: {"type":"sensor_data", ...}
  │
  └──► backend POST /api/webhook/sensor-data
         - stores the measurement in SQLite
         - evaluates alert rules
```

### Actuator Command Path (Frontend)

```
Web client sends {"type":"actuator_cmd", "device", "actuator", "value"}
  │
  ▼
NodeRED /ws/app
  - looks up the device by UUID and the actuator in its actuatorCodeMap
  - encodes to compact (e.g. L1) or JSON
  - sends to the device's WebSocket session
  │
  ▼
ESP32 runs the actuator callback
```

### Actuator Command Path (Backend)

```
POST /api/commands/send  {deviceId, actuator, value}   (authenticated)
  │
  ▼
Backend checks access, looks up the UUID
  POST http://localhost:1880/device-command  {deviceUUID, actuator, value}
  │
  ▼
NodeRED encodes and forwards to the device (same as above)
```

---

## Data at Each Layer

One temperature reading (24.5 °C) at every point in the system:

**Layer 1: ESP32 sends compact data**
```
T24.50
```

**Layer 2: NodeRED relays JSON to subscribed web clients**
```json
{ "type": "sensor_data", "device": "C10B65F4-...", "sensor": "temperature", "value": 24.5, "timestamp": 1672531200000 }
```

**Layer 2: NodeRED POSTs to the backend webhook**
```json
{ "device": "C10B65F4-...", "sensor": "temperature", "value": 24.5, "timestamp": 1672531200000 }
```

**Layer 5: frontend `useProtoFlow` hook receives**
```javascript
sensorData = { device: "C10B65F4-...", sensor: "temperature", value: 24.5, timestamp: 1672531200000 }
```

**Layer 5: frontend `api.get('/measurements/1?sensor=temperature')` returns**
```json
[{ "id": 42, "sensor_name": "temperature", "value": 24.5, "value_json": null, "measured_at": "2024-01-15T12:00:00.000Z", "received_at": "2024-01-15T12:00:00.100Z" }]
```

Note the differences: compact vs JSON, `sensor` vs `sensor_name`, millisecond timestamp vs ISO 8601. The compact protocol is only used on the ESP32 ↔ NodeRED link.

---

## See Also

- [Architecture Overview](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/architecture.md): five-layer system design
- [REST API Reference](./api-reference.md): backend endpoints and database schema
- [JavaScript Client API](./javascript-api.md): `protoflow.js` WebSocket client
- [Component Catalog](./components.md): what each built-in Grove component registers, and its exact values and commands
- [Add a Custom Sensor](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-custom-sensor.md) and [Add a Custom Actuator](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-custom-actuator.md)
