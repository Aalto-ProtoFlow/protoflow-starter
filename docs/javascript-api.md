# JavaScript Client API

`protoflow.js` is an event-based WebSocket client for communicating with ESP32 devices through the NodeRED message broker. It handles connection management, device discovery, sensor data subscriptions, and actuator commands.

- **Source**: `clients/js/protoflow.js`
- **Minified**: `clients/js/protoflow.min.js` (6.5KB)
- **Global**: Exposes `window.ProtoFlow` singleton (instance of `ProtoFlowClient`)
- **ES Module**: Also available as a default export for bundler-based projects

> **Note**: A modular SDK with a Digital Twin pattern (`sdk/*.js`) exists as an experimental, untested API. This document covers only the production-tested event-based API.

---

## Quick Start

### HTML (No Build Tools)

```html
<meta name="protoflow-websocket-url" content="ws://your-server.example.com:1880/ws/app">
<script src="clients/js/protoflow.min.js"></script>
<script>
    ProtoFlow
        .on('devices', devices => console.log('Devices:', devices))
        .on('sensor', data => console.log(data.sensor, data.value))
        .connect();
</script>
```

### ES Module (Vite, Webpack, etc.)

```javascript
import ProtoFlow from './lib/protoflow.js';

ProtoFlow.configure({
    websocketUrl: import.meta.env.VITE_WS_URL
});

ProtoFlow
    .on('sensor', data => console.log(data))
    .connect();
```

---

## Configuration

Configuration is resolved in the following priority order (highest to lowest):

1. `configure()` method calls
2. `<meta>` tags in the document head
3. `window.PROTOFLOW_CONFIG` global object
4. Built-in defaults

### Meta Tags

```html
<meta name="protoflow-websocket-url" content="ws://your-server.example.com:1880/ws/app">
<meta name="protoflow-websocket-app-url" content="ws://your-server.example.com:1880/ws/app">
<meta name="protoflow-client-name" content="My IoT Dashboard">
<meta name="protoflow-debug" content="true">
```

Both `protoflow-websocket-url` and `protoflow-websocket-app-url` set the WebSocket URL. Use whichever name is clearer for your project.

### Global Config Object

Define before loading the script:

```html
<script>
    window.PROTOFLOW_CONFIG = {
        websocketUrl: 'ws://your-server.example.com:1880/ws/app',
        clientName: 'My IoT Dashboard',
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
        pingInterval: 5000,
        debug: true
    };
</script>
<script src="clients/js/protoflow.min.js"></script>
```

### configure(options)

Override configuration at runtime. Can be called before or after `connect()`.

```javascript
ProtoFlow.configure({
    websocketUrl: 'ws://your-server.example.com:1880/ws/app',
    clientName: 'Custom Dashboard',
    debug: true
});
```

**Returns:** `ProtoFlow` (chainable)

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `websocketUrl` | string | -- | WebSocket URL (required) |
| `clientName` | string | `"ProtoFlow Web Client"` | Name sent during PWA registration |
| `reconnectInterval` | number | `3000` | Milliseconds between reconnect attempts |
| `maxReconnectAttempts` | number | `10` | Maximum reconnection attempts before giving up |
| `pingInterval` | number | `5000` | Milliseconds between keepalive pings |
| `debug` | boolean | `false` | Enable console logging |

---

## Connection Methods

### connect()

Connect to the NodeRED WebSocket server. Automatically sends PWA registration and requests the device list.

```javascript
ProtoFlow.connect();
```

**Returns:** `ProtoFlow` (chainable)

Connection is non-blocking. Use `on('connect', ...)` to detect when the client is registered and ready.

### disconnect()

Disconnect from NodeRED and stop all internal timers (ping, reconnect).

```javascript
ProtoFlow.disconnect();
```

**Returns:** `ProtoFlow` (chainable)

### isConnected()

Check whether the WebSocket connection is open.

```javascript
if (ProtoFlow.isConnected()) {
    console.log('WebSocket is open');
}
```

**Returns:** `boolean`

### isReady()

Check whether the client is both connected and registered with NodeRED. Use this before sending commands.

```javascript
if (ProtoFlow.isReady()) {
    ProtoFlow.sendCommand(deviceId, 'led', 1);
}
```

**Returns:** `boolean`

---

## Device Management

### getDevices()

Request the device list from NodeRED. The device list is also automatically requested after registration -- listen to the `'devices'` event for updates.

```javascript
const devices = await ProtoFlow.getDevices();
devices.forEach(device => {
    console.log(device.deviceName, device.uuid);
});
```

**Returns:** `Promise<Array>` -- array of device objects

### subscribeToDevice(uuid)

Subscribe to receive sensor data from a specific device. You must subscribe to a device before its sensor data events will fire.

```javascript
ProtoFlow.subscribeToDevice('C10B65F4-413F-4C3B-BE3F-000000013825');
```

**Returns:** `ProtoFlow` (chainable)

### unsubscribeFromDevice(uuid)

Stop receiving sensor data from a device.

```javascript
ProtoFlow.unsubscribeFromDevice(deviceId);
```

**Returns:** `ProtoFlow` (chainable)

### subscribeToAll()

Subscribe to all currently available devices.

```javascript
await ProtoFlow.subscribeToAll();
```

**Returns:** `Promise<void>`

---

## Actuator Control

### sendCommand(deviceUuid, actuatorName, value)

Send a command to an actuator on a device.

```javascript
// Boolean actuators (LED, relay, buzzer)
ProtoFlow.sendCommand(deviceId, 'led', 1);
ProtoFlow.sendCommand(deviceId, 'relay', true);

// Integer actuators (servo, PWM)
ProtoFlow.sendCommand(deviceId, 'servo', 90);
ProtoFlow.sendCommand(deviceId, 'pwm_led', 128);

// Motor control (negative = reverse)
ProtoFlow.sendCommand(deviceId, 'dc_motor', 200);
ProtoFlow.sendCommand(deviceId, 'dc_motor', -200);
ProtoFlow.sendCommand(deviceId, 'dc_motor', 0);

// Object actuators (RGB LED, display, tone)
ProtoFlow.sendCommand(deviceId, 'rgb_led', { r: 255, g: 128, b: 0 });
ProtoFlow.sendCommand(deviceId, 'tone_buzzer', { frequency: 440, duration: 1000 });
ProtoFlow.sendCommand(deviceId, 'display', { n: 1234 });  // Grove 4-digit display
```

**Returns:** `boolean` -- `true` if the message was sent

### Value Types by Actuator

| Actuator Type | Value Type | Range | Example |
|---------------|------------|-------|---------|
| `led` | boolean / int | 0--1 | `1` or `true` |
| `relay` | boolean / int | 0--1 | `1` or `true` |
| `buzzer` | boolean / int | 0--1 | `1` or `true` |
| `servo` | int | 0--180 | `90` |
| `pwm_led` | int | 0--255 | `128` |
| `dc_motor` | int | -255 to 255 | `200` |
| `rgb_led` | object | `{r, g, b}` 0--255 each | `{r: 255, g: 0, b: 0}` |
| `tone_buzzer` | object | `{frequency, duration}` | `{frequency: 440, duration: 1000}` |
| `display` | object | `{n}`, `{t: [h, m]}`, `{s}`, `{c}` or `{b}` | `{n: 1234}` |
| `stepper` | object | `{steps, direction, speed}` | `{steps: 100, direction: 1, speed: 100}` |

The exact values for every built-in Grove component, including the LCD, OLED, LED bar, RGB stick and MP3 player, are in the [Component Catalog](components.md).

---

## Event System

### on(event, callback)

Register an event callback. Multiple callbacks per event are supported. All `on()` calls are chainable.

```javascript
ProtoFlow
    .on('connect', () => console.log('Connected'))
    .on('devices', devices => console.log('Devices:', devices.length))
    .on('sensor', data => updateUI(data))
    .on('error', err => console.error(err))
    .connect();
```

**Returns:** `ProtoFlow` (chainable)

### off(event, callback)

Remove a specific event callback.

```javascript
const handler = data => console.log(data);
ProtoFlow.on('sensor', handler);

// Later:
ProtoFlow.off('sensor', handler);
```

**Returns:** `ProtoFlow` (chainable)

### Events Reference

| Event | Callback Data | Description |
|-------|---------------|-------------|
| `connect` | `{clientId}` | Connected and registered with NodeRED |
| `disconnect` | `{code, reason}` | WebSocket connection lost |
| `registered` | `{success, clientId}` | Registration acknowledged by NodeRED |
| `devices` | `[{uuid, deviceName, sensors, actuators, ...}]` | Device list received (fires automatically after connect) |
| `sensor` | `{device, sensor, value, timestamp}` | Sensor data from a subscribed device |
| `error` | `{message}` | Connection or protocol error |
| `message` | `{type, ...}` | Any raw message from NodeRED (useful for debugging) |

---

## Data Objects

### Sensor Data Object

Received via the `'sensor'` event:

```javascript
{
    device: "C10B65F4-413F-4C3B-BE3F-000000013825",
    sensor: "slider",
    value: 57.41,
    timestamp: 1672531200000
}
```

- `device` -- UUID of the source device
- `sensor` -- sensor name as declared in firmware registration
- `value` -- sensor reading (type varies: number, boolean, object)
- `timestamp` -- server-assigned timestamp in milliseconds

### Device Object

Received via the `'devices'` event:

```javascript
{
    uuid: "C10B65F4-413F-4C3B-BE3F-000000013825",
    deviceName: "Grove Slider Demo",
    deviceType: "ESP32",
    status: "acknowledged",
    sensors: [
        {
            name: "slider",
            type: "analog",
            data_type: "float",
            min_value: 0.0,
            max_value: 100.0,
            unit: "percentage",
            description: "Grove analog slider sensor"
        }
    ],
    actuators: [
        {
            name: "led",
            type: "led",
            data_type: "boolean",
            min_value: 0,
            max_value: 1,
            unit: "",
            description: "LED indicator"
        }
    ],
    lastSeen: "2024-01-15T12:00:00.000Z"
}
```

---

## React Integration

For React applications, wrap ProtoFlow in a `useEffect` hook with cleanup:

```jsx
import { useEffect, useState, useRef } from 'react';
import ProtoFlow from './lib/protoflow.js';

function SensorDashboard() {
    const [sensorData, setSensorData] = useState(null);
    const deviceRef = useRef(null);

    useEffect(() => {
        ProtoFlow
            .on('devices', devices => {
                if (devices.length > 0) {
                    deviceRef.current = devices[0];
                    ProtoFlow.subscribeToDevice(devices[0].uuid);
                }
            })
            .on('sensor', data => {
                setSensorData(data);
            })
            .connect();

        return () => ProtoFlow.disconnect();
    }, []);

    const toggleLED = () => {
        if (deviceRef.current) {
            ProtoFlow.sendCommand(
                deviceRef.current.uuid,
                'led',
                sensorData?.value > 50 ? 0 : 1
            );
        }
    };

    return (
        <div>
            <h1>Sensor: {sensorData?.value ?? '--'}</h1>
            <button onClick={toggleLED}>Toggle LED</button>
        </div>
    );
}
```

The starter app includes a `useProtoFlow` hook that encapsulates this pattern with connection state management and device subscription.

The starter app also provides an `api.js` HTTP client (`react/src/lib/api.js`) for REST API calls. It auto-attaches JWT tokens and provides `api.get()`, `api.post()`, `api.patch()`, and `api.delete()` methods. See the [Starter App README](../react/README.md) for details.

---

## Error Handling

### Common Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `"WebSocket URL not configured"` | No URL provided via meta tag, config, or `configure()` | Add a `<meta name="protoflow-websocket-url">` tag or call `configure()` |
| `"Not connected or registered"` | Calling methods before connection completes | Wait for the `'connect'` event before interacting |
| `"Cannot subscribe - not connected"` | WebSocket not open when subscribing | Check `isReady()` before calling `subscribeToDevice()` |
| `"Device not found"` | Invalid or stale UUID | Use UUIDs from the most recent `getDevices()` response |

### Connection Recovery

ProtoFlow automatically reconnects on connection loss:

- Default: up to 10 reconnect attempts at 3-second intervals
- Configurable via `reconnectInterval` and `maxReconnectAttempts`
- After reconnection, the client re-registers and re-subscribes automatically

```javascript
ProtoFlow
    .on('disconnect', () => {
        document.getElementById('status').textContent = 'Reconnecting...';
    })
    .on('connect', () => {
        document.getElementById('status').textContent = 'Connected';
    })
    .connect();
```

---

## Troubleshooting

### Enable Debug Logging

Via HTML:

```html
<meta name="protoflow-debug" content="true">
```

Via JavaScript:

```javascript
ProtoFlow.configure({ debug: true });
```

Debug mode logs all sent and received WebSocket messages, connection state changes, and internal errors to the browser console.

### Check Connection State

```javascript
console.log('Connected:', ProtoFlow.isConnected());
console.log('Ready:', ProtoFlow.isReady());
```

### Inspect Raw Messages

Listen to the `'message'` event to see all messages from NodeRED before they are dispatched to specific event handlers:

```javascript
ProtoFlow.on('message', msg => {
    console.log('Raw message:', msg);
});
```

### Common Issues

1. **No sensor data arriving** -- Did you call `subscribeToDevice(uuid)` after the `'devices'` event? Subscription is required before sensor data events fire.
2. **Commands not reaching the device** -- Check that `isReady()` returns `true`. Commands are silently dropped when the client is not registered.
3. **WebSocket connection fails** -- Verify the URL matches your server. HTTPS pages require `wss://` URLs; HTTP pages can use `ws://`. Check that the NodeRED broker is running.
4. **Device list is empty** -- Confirm that at least one ESP32 device is powered on and connected to NodeRED. Devices appear only after completing the registration handshake.
5. **Stale device data after reconnect** -- Listen for the `'devices'` event, which fires again after each reconnection with the current device list.

---

## See Also

- [Protocol Reference](./protocol.md) -- compact protocol, message formats, and code tables
- [REST API Reference](./api-reference.md) -- backend endpoints for history, alerts, and commands
- [Architecture Overview](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/architecture.md) -- five-layer system design and data flow
- [Getting Started](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/getting-started.md) -- end-to-end setup tutorial
