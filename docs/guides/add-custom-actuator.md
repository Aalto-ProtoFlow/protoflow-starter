# Add a Custom Actuator

## What you'll build

You will connect hardware that has no built-in ProtoFlow component, a hobby servo motor, register it with the ProtoFlow firmware library as an actuator, and control it from a web page. The same steps work for anything a sketch drives with the module's own Arduino library, such as a relay board or an e-paper display. Displays and other slow hardware are covered in [Commands with several values](#commands-with-several-values) and [Slow hardware](#slow-hardware), and one board controlling another in [A command from another board](#a-command-from-another-board).

**Use this guide only when there is no component for your module.** The modules in [components.md](../components.md) each have a component class (`GroveLED`, `GroveChainableRGB`, ...) that registers the actuator and handles its commands for you; use those instead.

## Prerequisites

- ESP32 with the ProtoFlow firmware library installed
- A hobby servo such as the SG90: signal (orange or yellow) to GPIO 25, power (red) to 5V, ground (brown or black) to GND. A servo needs 5 V; the 3V3 pin is too weak for it
- The **ESP32Servo** library by Kevin Harrington (Arduino IDE: Tools > Manage Libraries)
- A ProtoFlow server: your team server, or the whole platform running locally
- `config.h` created from `config.example.h`, with your WiFi and the server's `/ws/device` address
- For the React part of step 3: the React starter app running (`npm run dev` in `react/`)

> **Roles**: Steps 1–2 are **firmware developer** work. Step 3 is **frontend developer** work and can start as soon as the actuator's name and its command values are agreed.

## Steps

### 1. Register the actuator and handle its commands

Start from your board's sketch (in the student starter: `firmware/TeamDevice/TeamDevice.ino`) and add the parts marked `NEW`. The connection code stays as it is.

```cpp
#include <ProtoFlow.h>
#include <ESP32Servo.h>   // NEW: the servo's own library
#include "config.h"

#define DEVICE_NAME "Servo board"

// NEW: the servo. An actuator needs an output pin: not GPIO 34-39 (input only), and never 6-11.
const int SERVO_PIN = 25;
Servo servo;

void setup() {
    Serial.begin(115200);
    delay(1000);

    ProtoFlow.configureDevice(DEVICE_NAME, "ESP32");

    // NEW: start the servo in the middle
    servo.attach(SERVO_PIN);
    servo.write(90);

    // NEW: register the actuator before ProtoFlow.begin()
    //                    name     type     data_type  min  max  unit       description
    ProtoFlow.addActuator("servo", "servo", "int",     0,   180, "degrees", "Servo angle");

    // NEW: runs whenever a command for "servo" arrives
    ProtoFlow.onActuator("servo", [](JsonVariant value) {
        int angle = constrain(value.as<int>(), 0, 180);
        servo.write(angle);
        PF_INFO("servo: " + String(angle) + " degrees");
    });

    ProtoFlow.configureWiFi(WIFI_SSID, WIFI_PASSWORD);
    ProtoFlow.configureWebSocket(WEBSOCKET_URL, ROOT_CA_CERT);

    ProtoFlow.onConnect([]() {
        ProtoFlow.sendDeviceRegistration();
    });

    ProtoFlow.onRegistration([](bool accepted, String message) {
        if (!accepted) {
            PF_ERROR("Registration failed: " + message);
        }
    });

    ProtoFlow.begin();
}

void loop() {
    // Must run often: it keeps the connection alive and delivers the commands
    ProtoFlow.update();
}
```

Key firmware API calls:
- `ProtoFlow.addActuator(name, type, dataType, min, max, unit, description)`: registers the actuator. Call it in `setup()`, before `ProtoFlow.begin()`. Web pages see it in the device list with these values.
- `ProtoFlow.onActuator(name, handler)`: the handler gets the command's value as a `JsonVariant`. Read it with `value.as<int>()`, `value.as<float>()` or `value.as<bool>()`, or `value["key"]` for an object.

### 2. Check it

Upload the sketch and open the Serial Monitor at 115200 baud. Wait for `Registration ACCEPTED`, then send the board a command:

1. Open `html/index.html` in a browser. It lists the board with a `servo` line.
2. Open the browser's developer console and type `ProtoFlow.sendCommand('UUID', 'servo', 45)`, with the board's UUID from the Serial Monitor's `device UUID` line.
3. The servo turns, and the Serial Monitor shows `servo: 45 degrees`. In the Node-RED editor, the debug sidebar shows the command under **PWA RAW**.

### 3. Control it from a web page

**Plain HTML**: `html/index.html` gives every on/off actuator On and Off buttons, and other actuators only a note. Give the servo a slider: in its actuator loop, add the `NEW` branch before the `else`.

```javascript
if (actuator.data_type === 'boolean') {
    // ... the On and Off buttons, as before
} else if (actuator.name === 'servo') {
    // NEW: a slider; onchange sends one command when the slider is let go
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 180;
    slider.onchange = () => ProtoFlow.sendCommand(device.uuid, 'servo', Number(slider.value));
    row.append(slider);
} else {
    row.append(' (its commands are in docs/components.md, or in the sketch for an actuator of your own)');
}
```

**React**: create `react/src/components/ServoControl.jsx`. It gets `sendCommand` from the page as a prop: `useProtoFlow()` belongs in the page component only, because the component that calls it closes the shared connection when it unmounts.

```jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ServoControl({ deviceUuid, sendCommand }) {
  const [angle, setAngle] = useState(90);

  function send(newAngle) {
    setAngle(newAngle);
    sendCommand(deviceUuid, 'servo', newAngle);
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Servo angle: {angle}&deg;</label>
      <input
        type="range"
        min={0}
        max={180}
        value={angle}
        onChange={(e) => send(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex gap-2">
        {[0, 90, 180].map((preset) => (
          <Button key={preset} size="sm" variant="outline" onClick={() => send(preset)}>
            {preset}&deg;
          </Button>
        ))}
      </div>
    </div>
  );
}
```

Then use it in `react/src/pages/DashboardPage.jsx`: take `sendCommand` from the hook the page already calls, and show the control once the device is loaded.

```jsx
import ServoControl from '../components/ServoControl.jsx';

const { status, devices, sensorData, connect, disconnect, subscribe, sendCommand } = useProtoFlow();

{device && <ServoControl deviceUuid={device.uuid} sendCommand={sendCommand} />}
```

Commands can also go through the backend, which checks the user's login and access to the device: `POST /api/commands/send` in [api-reference.md](../api-reference.md), and [Trigger Actuators from the Backend](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/trigger-actuators-from-backend.md) for commands sent by alerts or schedules.

## Verify it works

1. The Serial Monitor shows `Registration ACCEPTED` and no errors
2. Moving the slider on the page turns the servo, and the Serial Monitor shows each angle
3. Send `ProtoFlow.sendCommand('UUID', 'servo', 500)` from the console: the servo stops at 180 degrees, because the handler limits the value

## Commands with several values

A display, or anything else that takes more than one number, gets an object. Give it a type word of your own and the data type `object`: the command then reaches the board as JSON, exactly as the page sent it, and nothing in Node-RED needs to change. A text panel that takes `{"t": ["line 1", "line 2"]}`:

```cpp
// in setup(), before ProtoFlow.begin()
//                    name     type          data_type  min  max  unit  description
ProtoFlow.addActuator("panel", "text_panel", "object",  0,   0,   "",   "Text panel, 4 lines");
```

```javascript
// on a page
ProtoFlow.sendCommand(device.uuid, 'panel', { t: ['Hello', 'world'] });
```

The handler reads `value["t"]`; the next section shows it.

## Slow hardware

The board does nothing else while a handler runs. A few seconds is fine: the connection survives, and commands that arrive meanwhile wait and run afterwards, one at a time. But e-paper displays take seconds per refresh and shouldn't refresh constantly, and a page that sends on every slider step would queue many refreshes. So for slow hardware, the handler only stores the command, and `loop()` applies the latest one at most every few seconds:

```cpp
const int PANEL_LINES = 4;
const unsigned long MIN_DRAW_INTERVAL_MS = 10000;   // e-paper: check how often your panel may refresh
String panelText[PANEL_LINES];
bool panelChanged = false;
unsigned long lastDrawMs = 0;   // 0 = nothing drawn yet

// Replace the body with your display library's drawing calls
void drawPanel() {
    for (int i = 0; i < PANEL_LINES; i++) {
        Serial.println(panelText[i]);
    }
}

// in setup(), after the addActuator above
ProtoFlow.onActuator("panel", [](JsonVariant value) {
    JsonArray lines = value["t"];
    if (lines.isNull()) {
        PF_WARN("panel expects {\"t\": [\"line 1\", \"line 2\"]}");
        return;
    }
    for (int i = 0; i < PANEL_LINES; i++) {
        panelText[i] = lines[i] | "";   // copies the text; missing lines become empty
    }
    panelChanged = true;                // drawn in loop()
});

// in loop(), after ProtoFlow.update(): the first command at once, then at most one per interval
if (panelChanged && (lastDrawMs == 0 || millis() - lastDrawMs >= MIN_DRAW_INTERVAL_MS)) {
    panelChanged = false;
    lastDrawMs = millis();
    drawPanel();
}
```

Copy what you need out of `value`, as the `String`s here do: the `JsonVariant` is valid only while the handler runs.

## A command from another board

A board can send a command to another board's actuator, or to its own, exactly as a web page does: both boards connect to the same server, and Node-RED passes the command on. No web page needs to be open. On the board that decides, here one with a `GroveButton button`:

```cpp
// in loop(), after button.loop(): send when something changes, not on every loop()
static bool wasPressed = false;
bool pressed = button.isPressed();
if (pressed != wasPressed) {
    wasPressed = pressed;
    ProtoFlow.sendCommand("Servo board", "servo", pressed ? 180 : 0);
}
```

- The first argument is the other board's `DEVICE_NAME`, or its UUID from the Serial Monitor's `device UUID` line. Give every board its own name; if two boards share one, the command needs the UUID.
- The value is what the other board's actuator expects: from [components.md](../components.md) for a component, from its sketch for an actuator of your own.
- The other board needs nothing new. Its actuator is an ordinary one, so a web page can send it the same command.
- If the command can't be delivered (the other board is off, the name is wrong, or it has no such actuator), the sending board's Serial Monitor shows `Command not delivered: …`. Before the board's registration is accepted, `sendCommand` sends nothing and returns `false`.

## Rules for your own actuators

- **Name**: the first `addActuator` argument is the name pages send commands to. Keep it unique on the board, lowercase, without spaces.
- **Type**: a word of your own (`text_panel`, `pump`) is always safe: the command travels as JSON. These words travel in a short compact form instead: `led`, `pwm_led`, `servo`, `dc_motor`, `rgb_led`, `buzzer`, `relay`, `stepper`, `fan`, `valve`, `heater`, `tone_buzzer`, `pwm`, `dac`. Use one of them only with a single number or on/off value, and only if no other actuator on the board has the same type, such as `led` next to a `GroveLED`: a compact command reaches only the first actuator of its type.
- **Data type**: exactly `boolean`, `int`, `float` or `object`. `min` and `max` tell pages the range of a number.
- **Check the value**: the handler gets whatever a page sends. Limit numbers with `constrain()`, and ignore a value of the wrong shape with a `PF_WARN`.
- **Pins**: an actuator needs an output pin: not GPIO 34-39 (input only), and never 6-11 (the board's flash memory).
- **State**: pages don't know what the hardware is doing. If they should (whether the pump is on, what the panel shows), send it as a sensor too: [A value computed on the board](./add-custom-sensor.md#a-value-computed-on-the-board).
- **Network**: never write your own WiFi, WebSocket, HTTP or MQTT code. `addActuator` and `onActuator` are the only way in.

## Next steps

- [Add a Custom Sensor](./add-custom-sensor.md): a module the board reads, or a value it computes
- [Trigger Actuators from the Backend](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/trigger-actuators-from-backend.md): automate commands based on alerts and schedules
- [Add a Backend Route](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-backend-route.md): create custom endpoints for your product logic
