# ProtoFlow: context for AI chat tools

For AI tools that can't see this project's files, such as ChatGPT, Gemini or Claude in the browser: attach this file at the start of the conversation. AI tools that work inside the repository (Codex, Claude Code, Cursor, Copilot) don't need it: they read AGENTS.md.

It contains, in order: the project instructions (`AGENTS.md`), the template board sketch (`firmware/TeamDevice/TeamDevice.ino`), the smallest complete web page (`html/index.html`), the component catalog (`docs/components.md`), how a sketch sends a sensor or value that has no component (`docs/guides/add-custom-sensor.md`) and the connector library's API (`docs/javascript-api.md`). It is generated from those files by the starter's build; don't edit it. Not included: `docs/api-reference.md` (the backend's REST API, for accounts and history in the React app) and `docs/protocol.md` (the message format between apps and Node-RED); paste them when a task needs them.

**Instructions for the AI.** ProtoFlow is a small teaching platform that you have not seen before. Use only the libraries, classes, functions, names and message formats in this file, and never replace them with generic Arduino, WebSocket, HTTP or MQTT code. You can't see the user's files: ask them to paste their current sketch or page before you change it. Ask which pin each module is wired to, and, while this file still says `YOUR-TEAM`, what their team server is called.

---

# File: AGENTS.md


Instructions for AI coding assistants working in this repository. People: start with README.md.

## What this is

The web app and the board sketches for one team's ProtoFlow prototype. ProtoFlow connects ESP32 boards with Grove sensors and actuators to web pages:

- ESP32 boards run Arduino sketches and connect to the team server over WiFi.
- The team server, `YOUR-TEAM.proto.aalto.fi`, runs Node-RED, which relays live data and commands, and a backend for accounts, devices and history.
- This app runs in the browser and talks only to the team server: live data and commands over WebSocket at `wss://YOUR-TEAM.proto.aalto.fi/ws/app`, accounts and history over HTTPS at `https://YOUR-TEAM.proto.aalto.fi/api`.

The app is static files. It is not deployed to the team server: people open it from disk or host it on GitHub Pages, Vercel or Netlify (see README.md).

## Layout

| Path | What |
|---|---|
| `html/` | Plain HTML pages, no build step. `index.html` is the smallest complete page; `viewer-multi.html`, `controller.html` and `bidirectional.html` are larger references |
| `react/` | React 19 app (Vite, React Router 7, Tailwind CSS 4, shadcn/ui, Chart.js): login, devices, live dashboard, history, settings |
| `firmware/` | Arduino sketches, one folder per board. `firmware/TeamDevice/` is the template: connected and registered, with one LED |
| `docs/components.md`, `docs/components.json` | Every Grove component: sensor names and values, actuator commands, and how a sketch uses it ("In a sketch") |
| `docs/javascript-api.md` | The connector library, `protoflow.js` |
| `docs/protocol.md` | Messages between the app and Node-RED |
| `docs/api-reference.md` | Backend REST API: accounts, devices, measurements, alerts, commands |
| `docs/guides/` | How-tos: a sensor or value without a component (`add-custom-sensor.md`), a React visualization, a new React page |
| `TEAM-GUIDE.md` | For people: the team server's addresses, the Node-RED editor, setting up Arduino IDE and flashing the ESP32s |
| `AI-CONTEXT.md` | Generated copy of this file and the main docs, for AI chat tools that can't see the repository. Don't edit it |

## Rules

1. Never guess a sensor's value format or an actuator's command. Take them from `docs/components.md`. Sensor and actuator names (`led`, `climate_temp`, ...) are chosen in each device's sketch: the catalog lists the names the example sketches use, and the device list shows what a device actually registered.
2. Use the connector library; don't write your own WebSocket code. HTML pages load `https://proto.aalto.fi/protoflow.min.js`, and the React app imports `react/src/lib/protoflow.js`. Don't edit either.
3. The server address is set in the `protoflow-websocket-url` meta tag of each HTML page and in `react/.env` (`VITE_WS_URL`, `VITE_API_URL`). If they still contain `YOUR-TEAM`, ask the user for their server's name.
4. In React, call `useProtoFlow()` in only one component per page (the page component) and pass values and `sendCommand` down as props. The hook closes the shared connection when the component that called it unmounts.
5. A page must work before any data arrives: show "no data yet" until a sensor's first value. Some sensors send only when their value changes.
6. Don't change the team server (Node-RED flows, backend) from this repository. Team servers can be rebuilt at any time, so everything the app needs lives here.
7. Never put passwords or tokens in the repository. The addresses in `react/.env` are public, which is why that file is committed.

## The connector in brief

```javascript
ProtoFlow
  .on('connect', () => { /* registered with Node-RED; the device list follows */ })
  .on('devices', (devices) => {
    // [{ uuid, deviceName, status, sensors: [...], actuators: [...] }, ...]
    devices.forEach((device) => ProtoFlow.subscribeToDevice(device.uuid));
  })
  .on('sensor', ({ device, sensor, value, timestamp }) => { /* one reading */ })
  .on('disconnect', () => { /* it reconnects by itself */ })
  .on('error', ({ message }) => console.error(message))
  .connect();

ProtoFlow.sendCommand(deviceUuid, 'led', true);   // values: docs/components.md
```

Each device's `sensors` and `actuators` carry their registration (`name`, `type`, `data_type`, `unit`, and `min_value` / `max_value` for numbers), so a UI can set itself up from it. Subscribing twice is harmless. Full API: `docs/javascript-api.md`.

## Board sketches (`firmware/`)

The boards run the ProtoFlow Arduino library. It is installed in Arduino IDE from `ProtoFlow.zip` (TEAM-GUIDE.md, part 1) and is not in this repository. What you need from it is in `docs/components.md`: for every Grove module, under "In a sketch", its `#include`, a declaration with the meaning of each field, its optional settings, the calls it needs and the extra Arduino library it needs.

1. Start from `firmware/TeamDevice/TeamDevice.ino`, or the team's existing sketch for that board. Don't write a sketch from scratch, and keep its connection code (`ProtoFlow.configureWiFi`, `configureWebSocket`, `onConnect`, `onRegistration`, `begin`, `update`) as it is.
2. Use each module only through its component class from `docs/components.md` (`GroveLED`, `GroveTempHumidity`, ...). Never drive a module's pin with `digitalWrite()`, `analogRead()` or similar, and never write your own WiFi, WebSocket, HTTP or MQTT code: the class is what makes the module visible to Node-RED and the web app, and what turns their commands into pin changes. Only for a module that has no class, or a value the board computes itself (such as whether the LED is on), follow `docs/guides/add-custom-sensor.md`: read it as that guide shows and send it with `ProtoFlow.addSensor` and `ProtoFlow.sendSensorData`.
3. Ask the user which pin each module is wired to; don't guess, and don't silently keep the example's pin. Every module needs its own pin. Analog modules need GPIO 32-39 (the other analog pins stop working while WiFi is on). I²C modules use SDA 21 and SCL 22.
4. Each module needs `x.setup()` in `setup()` and `x.loop()` in `loop()`; sensors also need `x.sendInitial()` in the `onRegistration` callback. The name in the declaration (`"led"`, `"climate"`) is the name the web app uses: keep the sketch and the pages consistent.
5. If a module needs an extra Arduino library, tell the user to install it (Arduino IDE: Tools > Manage Libraries).
6. `config.h` (WiFi password, server address) is gitignored and stays out of the repository. Create it from `config.example.h` in the sketch's folder; the server address is `wss://YOUR-TEAM.proto.aalto.fi/ws/device`.
7. One sketch per board. For another board, copy the folder and give the folder and the `.ino` file the same new name (Arduino requires it), and a new `DEVICE_NAME`.

## Check your work

- HTML: open the page in a browser and watch the browser console.
- React: `npm run dev` while developing; `npm run build` must succeed before publishing.
- Sketches: if `arduino-cli` is available, `arduino-cli compile --fqbn esp32:esp32:esp32 firmware/<Sketch>` must succeed. Otherwise ask the user to upload it in Arduino IDE and to paste the Serial Monitor output: it should show `WiFi connected`, `WebSocket connected` and `Registration ACCEPTED`.
- Live data needs a powered device connected to the team server. If none is connected, the device list is empty; ask the user to switch one on.

---

# File: firmware/TeamDevice/TeamDevice.ino

```cpp
/*
 * TeamDevice.ino - Starting point for one of your team's ESP32 boards.
 *
 * Connects to your team server and registers the modules declared below, so that Node-RED and
 * your web app see them and can control them. As it comes, it has one Grove LED on GPIO 33,
 * which html/index.html and html/controller.html can switch on and off.
 *
 * Add a module: look it up in docs/components.md, under "In a sketch". Copy its #include and
 * its declaration below, change the pin to where the module is wired, and add its calls in the
 * places marked ADD. Install the Arduino library it needs, if any (Tools > Manage Libraries).
 * Use modules only through their component classes, never with digitalWrite() or analogRead()
 * on their pins: otherwise Node-RED and the web app never see them.
 *
 * Several boards: copy this folder, give the folder and the .ino file the same new name, and
 * give each board its own DEVICE_NAME.
 *
 * SETUP: create config.h from config.example.h (TEAM-GUIDE.md, part 2). It holds your WiFi
 * password, so .gitignore keeps it out of git.
 */

#include <ProtoFlow.h>
#include "config.h"

// The name this board shows in Node-RED and the web app
#define DEVICE_NAME "Team device"

// ---------------------------------------------------------------------------------------------
// Modules. ADD: the #include and the declaration of each module (docs/components.md)
// ---------------------------------------------------------------------------------------------
#include <components/GroveLED.h>

//              name   pin  inverted
GroveLED led = {"led", 33, false};

void setup() {
    Serial.begin(115200);
    delay(1000);

    ProtoFlow.configureDevice(DEVICE_NAME, "ESP32");

    // ADD: <module>.setup(); for every module
    led.setup();

    ProtoFlow.configureWiFi(WIFI_SSID, WIFI_PASSWORD);
    ProtoFlow.configureWebSocket(WEBSOCKET_URL, ROOT_CA_CERT);

    ProtoFlow.onConnect([]() {
        ProtoFlow.sendDeviceRegistration();
    });

    ProtoFlow.onRegistration([](bool accepted, String message) {
        if (accepted) {
            // ADD: <sensor>.sendInitial(); for every sensor (components.md says which have it)
        } else {
            PF_ERROR("Registration failed: " + message);
        }
    });

    ProtoFlow.begin();
}

void loop() {
    // Must run often: it keeps the connection alive and delivers commands to the modules
    ProtoFlow.update();

    if (!ProtoFlow.isOperational()) {
        delay(10);
        return;
    }

    // ADD: <module>.loop(); for every module
    led.loop();
}
```

---

# File: html/index.html

```html
<!DOCTYPE html>
<!--
  ProtoFlow starter page: the smallest complete web page for a ProtoFlow prototype.
  It connects to your team server, lists the devices, shows each sensor value as it
  arrives and gives every on/off actuator an On and an Off button. Build your own page
  from it. Exact values and commands for each component: ../docs/components.md
-->
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ProtoFlow starter</title>

    <!-- Your team server: replace YOUR-TEAM with its name, for example alpha -->
    <meta name="protoflow-websocket-url" content="wss://YOUR-TEAM.proto.aalto.fi/ws/app">
    <script src="https://proto.aalto.fi/protoflow.min.js"></script>

    <style>
        body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
        .device { border: 1px solid #ccc; border-radius: 8px; padding: 0.25rem 1rem; margin: 1rem 0; }
        .value { font-weight: bold; font-variant-numeric: tabular-nums; }
        .muted { color: #666; }
        button { margin-left: 0.5rem; }
    </style>
</head>
<body>
    <h1>ProtoFlow starter</h1>
    <p><span id="status" class="muted">Connecting…</span> <button id="refresh">Refresh devices</button></p>
    <div id="devices"></div>

    <script>
        const statusText = document.getElementById('status');
        const devicesBox = document.getElementById('devices');
        const valueCells = new Map();   // "deviceUuid/sensorName" → the element showing its value

        function line(text) {
            const p = document.createElement('p');
            p.textContent = text;
            return p;
        }

        // One section per device, built from the sensors and actuators it registered
        function showDevices(devices) {
            devicesBox.replaceChildren();
            valueCells.clear();
            if (devices.length === 0) {
                devicesBox.append(line('No devices are connected to this server yet.'));
            }
            for (const device of devices) {
                const section = document.createElement('section');
                section.className = 'device';
                const title = document.createElement('h2');
                title.textContent = device.deviceName;
                section.append(title);

                for (const sensor of device.sensors || []) {
                    const row = line(`${sensor.name}: `);
                    const value = document.createElement('span');
                    value.className = 'value';
                    value.textContent = 'no data yet';
                    row.append(value, ` ${sensor.unit || ''}`);
                    valueCells.set(`${device.uuid}/${sensor.name}`, value);
                    section.append(row);
                }

                for (const actuator of device.actuators || []) {
                    const row = line(actuator.name);
                    if (actuator.data_type === 'boolean') {
                        for (const [label, command] of [['On', true], ['Off', false]]) {
                            const button = document.createElement('button');
                            button.textContent = label;
                            button.onclick = () => ProtoFlow.sendCommand(device.uuid, actuator.name, command);
                            row.append(button);
                        }
                    } else {
                        row.append(' (its commands are in docs/components.md)');
                    }
                    section.append(row);
                }

                devicesBox.append(section);
                ProtoFlow.subscribeToDevice(device.uuid);   // subscribing again is harmless
            }
        }

        function showValue({ device, sensor, value }) {
            const cell = valueCells.get(`${device}/${sensor}`);
            if (!cell) return;
            if (typeof value === 'number') cell.textContent = value.toFixed(1);
            else if (typeof value === 'object') cell.textContent = JSON.stringify(value);
            else cell.textContent = String(value);
        }

        document.getElementById('refresh').onclick = () => ProtoFlow.getDevices().catch(() => {});

        ProtoFlow
            .on('connect', () => { statusText.textContent = 'Connected'; })
            .on('disconnect', () => { statusText.textContent = 'Disconnected, trying again…'; })
            .on('devices', showDevices)
            .on('sensor', showValue)
            .on('error', ({ message }) => { statusText.textContent = message; })
            .connect();
    </script>
</body>
</html>
```

---

# File: docs/components.md


<!-- Generated by dev/scripts/build-components-doc.js from components.json. Edit components.json, not this file. -->

What each built-in Grove component registers, the exact values a web app receives from it or sends to it, and how an Arduino sketch uses it (ProtoFlow library 1.3.1). Programs and AI tools can read the registrations and values from [components.json](components.json).

## Rules for every component

- Names are chosen in the sketch. The names below are the ones the example sketches use. Components that register several sensors build the names from the instance name: `climate` gives `climate_temp` and `climate_humidity`.
- Receive sensor data: subscribe to the device, then `ProtoFlow.on('sensor', ({ device, sensor, value, timestamp }) => ...)`. `sensor` is the registered name, and `value` has the form listed for that sensor.
- Numbers sent in compact form arrive rounded to two decimals. Numbers sent as JSON (for example the joystick axes, which share a type) can have more, so round them before display. On/off sensors arrive as `true` or `false`.
- The example sketches send each sensor's current value once the device has registered, then again whenever it changes. The change threshold and the rate are set in the sketch.
- The device list (`ProtoFlow.on('devices', ...)`) carries each sensor and actuator as the device registered it: `name`, `type`, `data_type`, `unit` and `description` when set, and `min_value` / `max_value` for `float` and `int` only. A UI can set itself up from it. (The `min` and `max` below are what the sketch passes, including for other types.)
- Send a command: `ProtoFlow.sendCommand(deviceUuid, actuatorName, value)`, with a `value` from that actuator's command list. Send each command as its own message, exactly as listed.
- On/off actuators (types `led` and `buzzer`) take `true` / `false`, `1` / `0` or `"on"` / `"off"`. Node-RED reads the strings `"on"`, `"1"` and `"true"` (any case) as on and every other string as off. Any other value is on when it is truthy, so every number except 0 means on.
- `rgb_led` and `tone_buzzer` commands are packed into a short code on the way to the device. Only `{r, g, b}` and `{frequency, duration}` get through, so always send exactly those fields, as numbers.
- Don't put two actuators of the same type on one device: a command always reaches the first one. `GroveVibrator` and `GroveBuzzer` are both `buzzer`; `GroveLED` and `GroveLEDButton` are both `led`.
- Components marked untested have not been verified on hardware yet.
- In a sketch, use each module only through its component class (`GroveLED`, `GroveTempHumidity`, ...): the class registers the module, so Node-RED and web apps see it, and turns their commands into pin changes. Code that drives the module's pin directly (`digitalWrite`, `analogRead`) works on the board, but the rest of the system never sees it.
- The pins in the examples are only defaults. Use the pin the module is actually wired to. Each module needs its own pin; analog modules need GPIO 32-39 (the other analog pins stop working while WiFi is on); I²C modules use SDA 21 and SCL 22.

## Overview

| Component | Module | Registers (names in the example) | Tested on hardware |
|---|---|---|---|
| [GroveSlider](#groveslider) | Grove - Slide Potentiometer | `slider` sensor | yes |
| [GroveRotaryAngle](#groverotaryangle) | Grove - Rotary Angle Sensor v1.2 / (P) v1.2 | `knob` sensor | no |
| [GroveButton](#grovebutton) | Grove - Button / Button (P) v1.2a | `button` sensor | yes |
| [GroveThumbJoystick](#grovethumbjoystick) | Grove - Thumb Joystick v1.0 | `joystick_x` sensor, `joystick_y` sensor, `joystick_button` sensor | yes |
| [GrovePIR](#grovepir) | Grove - PIR Motion Sensor / Mini PIR Motion Sensor v1.8 | `motion` sensor | no |
| [GroveSound](#grovesound) | Grove - Sound Sensor v1.6 / Loudness Sensor | `sound` sensor | no |
| [GroveUltrasonic](#groveultrasonic) | Grove - Ultrasonic Ranger v2.0 | `distance` sensor | no |
| [GroveTempHumidity](#grovetemphumidity) | Grove - Temperature & Humidity Sensor (DHT11, blue) / Pro (DHT22, white) | `climate_temp` sensor, `climate_humidity` sensor | yes |
| [GroveAccelerometer](#groveaccelerometer) | Grove - 3-Axis Digital Accelerometer (±16g, ADXL345) | `accelerometer` sensor | yes |
| [GroveGesture](#grovegesture) | Grove - Gesture Sensor (PAJ7620) | `gesture` sensor | yes |
| [GroveLED](#groveled) | Grove - LED | `led` actuator | yes |
| [GroveLEDBar](#groveledbar) | Grove - LED Bar v2.1 | `ledbar` actuator | yes |
| [GroveChainableRGB](#grovechainablergb) | Grove - Chainable RGB LED (P9813) | `rgb` actuator | yes |
| [GroveRGBLEDStick](#grovergbledstick) | Grove - RGB LED Stick (10 WS2813 Mini LEDs) | `rgbstick` actuator | yes |
| [GroveVibrator](#grovevibrator) | Grove - Vibration Motor | `vibrator` actuator | yes |
| [GroveBuzzer](#grovebuzzer) | Grove - Buzzer | `buzzer` actuator | no |
| [GroveSpeaker](#grovespeaker) | Grove - Speaker | `speaker` actuator | no |
| [Grove4DigitDisplay](#grove4digitdisplay) | Grove - 4-Digit Display (TM1637) | `display` actuator | yes |
| [GroveLCDRGB](#grovelcdrgb) | Grove - LCD RGB Backlight v4.0 (16 x 2 characters) | `lcd` actuator | yes |
| [GroveOLED](#groveoled) | Grove - OLED Display 0.96" (128 x 64 pixels) | `oled` actuator | yes |
| [GroveLEDButton](#groveledbutton) | Grove - Yellow / Red LED Button | `button` sensor, `led` actuator | no |
| [GroveMP3](#grovemp3) | Grove - MP3 v4.0 (WT2605CX) | `mp3_status` sensor, `mp3` actuator | yes |

## Sensors

### GroveSlider

**Grove - Slide Potentiometer.** Slider position as a percentage. Example sketch: [Sensors/GroveSlider](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveSlider/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `slider` | `slider` | `float` | 0 to 100 percentage | Number 0-100: the slider position. | `57.41` |

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveSlider.h>

GroveSlider slider = {"slider", 32, 0.2, 100, 0.5};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `pin` | Analog GPIO pin number |
| `emaAlpha` | EMA smoothing factor (0.1-0.5, lower = smoother) |
| `updateRateMs` | Minimum ms between updates |
| `changeThreshold` | Minimum % change to send |

Call `slider.setup()` in `setup()`, `slider.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `slider.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `slider.getValue()` | Get current smoothed value (0-100%) |
| `slider.getRawValue()` | Get raw ADC value (0-4095) |

### GroveRotaryAngle

**Grove - Rotary Angle Sensor v1.2 / (P) v1.2.** Knob position as a percentage of its 300-degree turn. Example sketch: [Sensors/GroveRotaryAngle](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveRotaryAngle/). **Untested on hardware.**

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `knob` | `potentiometer` | `float` | 0 to 100 percentage | Number 0-100: the knob's position across its 300-degree turn. | `42.5` |

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveRotaryAngle.h>

GroveRotaryAngle knob = {"knob", 32, 0.2, 100, 0.5};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `pin` | Analog GPIO pin number |
| `emaAlpha` | EMA smoothing factor (0.1-0.5, lower = smoother) |
| `updateRateMs` | Minimum ms between updates |
| `changeThreshold` | Minimum % change to send |

Call `knob.setup()` in `setup()`, `knob.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `knob.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `knob.getValue()` | Get current value as percentage (0-100%) |
| `knob.getAngle()` | Get current value as angle (0-300 degrees) |
| `knob.getRawValue()` | Get raw ADC value (0-4095) |

### GroveButton

**Grove - Button / Button (P) v1.2a.** Push button, debounced. Example sketch: [Sensors/GroveButton](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveButton/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `button` | `digital` | `boolean` | — | `true` while pressed, `false` when released. | `true` |

- The GroveDualButton example shows two buttons on one device (`button_a`, `button_b`).

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveButton.h>

GroveButton button = {"button", 32, 50, true};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `pin` | GPIO pin number |
| `debounceMs` | Debounce time in milliseconds (default: 50) |
| `activeHigh` | true = HIGH when pressed (SeeedStudio default), false = LOW when pressed |

Call `button.setup()` in `setup()`, `button.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `button.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `button.readButton()` | Read button state based on activeHigh configuration |
| `button.isPressed()` | Get current button state |

### GroveThumbJoystick

**Grove - Thumb Joystick v1.0.** Two-axis stick with a push button. Example sketch: [Sensors/GroveThumbJoystick](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveThumbJoystick/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `joystick_x` | `slider` | `float` | 0 to 100 percentage | Number 0-100: 0 = left, 50 = centre, 100 = right. | `50` |
| `joystick_y` | `slider` | `float` | 0 to 100 percentage | Number 0-100: 0 = down, 50 = centre, 100 = up. | `50` |
| `joystick_button` | `button` | `boolean` | — | `true` while the stick is pressed down. | `false` |

- `joystick_button` is registered only when the sketch enables the button (the example does).
- Calibrate the centre and the ends with the GroveThumbJoystickCalibration example.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveThumbJoystick.h>

GroveThumbJoystick joystick = {"joystick", 32, 33, true, 0.3, 50, 1.0, 3.0};
```

| Field, in order | Meaning |
|---|---|
| `name` | Base sensor name for ProtoFlow |
| `pinX` | Analog GPIO pin for X axis |
| `pinY` | Analog GPIO pin for Y axis |
| `enableButton` | Enable integrated button detection |
| `emaAlpha` | EMA smoothing factor (0.1-0.5, lower = smoother) |
| `updateRateMs` | Minimum ms between updates |
| `changeThreshold` | Minimum % change to send |
| `deadzone` | Deadzone around center (0-10%, 0 to disable) |

Optional settings, set before `joystick.setup()`, e.g. `joystick.centerX = 2900;`:

| Setting | Default | Meaning |
|---|---|---|
| `centerX` | `2900` | Calibration values (defaults based on Grove Thumb Joystick measurements) Center X value |
| `centerY` | `2800` | Center Y value |
| `minX` | `1400` | Minimum X (full left) |
| `maxX` | `4095` | Maximum X (full right) |
| `minY` | `1400` | Minimum Y (full down) |
| `maxY` | `4095` | Maximum Y (full up) |

Call `joystick.setup()` in `setup()`, `joystick.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `joystick.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `joystick.setCalibration(int xMin, int xCenter, int xMax, int yMin, int yCenter, int yMax)` | Set manual calibration values |
| `joystick.getX()` | Get current X axis value (0-100%) |
| `joystick.getY()` | Get current Y axis value (0-100%) |
| `joystick.isButtonPressed()` | Get button state (true = pressed) |
| `joystick.getNormalizedX()` | Get normalized X value (-1.0 to +1.0, center = 0) |
| `joystick.getNormalizedY()` | Get normalized Y value (-1.0 to +1.0, center = 0) |
| `joystick.getRawX()` | Get raw X ADC value (for debugging) |
| `joystick.getRawY()` | Get raw Y ADC value (for debugging) |

### GrovePIR

**Grove - PIR Motion Sensor / Mini PIR Motion Sensor v1.8.** Detects movement of people and animals. Example sketch: [Sensors/GrovePIR](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GrovePIR/). **Untested on hardware.**

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `motion` | `motion` | `boolean` | — | `true` while motion is detected, `false` otherwise. | `true` |

- Needs a warm-up after power-on (30 s in the example) and reports `false` until then.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GrovePIR.h>

GrovePIR motion = {"motion", 32, 30000};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `pin` | GPIO pin number |
| `warmupMs` | Warmup time in milliseconds (default: 30000 = 30s) |

Call `motion.setup()` in `setup()`, `motion.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `motion.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `motion.isMotionDetected()` | Check if motion is currently detected |
| `motion.isWarmedUp()` | Check if sensor has completed warmup |
| `motion.getWarmupProgress()` | Get warmup progress (0.0 to 1.0) |

### GroveSound

**Grove - Sound Sensor v1.6 / Loudness Sensor.** Loudness of the surroundings. Example sketch: [Sensors/GroveSound](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveSound/). **Untested on hardware.**

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `sound` | `sound` | `float` | 0 to 100 level | Number 0-100: relative loudness, not decibels. | `23.4` |

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveSound.h>

GroveSound sound = {"sound", 32, 0.3, 50, 2.0};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `pin` | Analog GPIO pin number |
| `emaAlpha` | EMA smoothing factor (0.1-0.5, higher = faster response) |
| `updateRateMs` | Minimum ms between updates |
| `changeThreshold` | Minimum % change to send |

Call `sound.setup()` in `setup()`, `sound.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `sound.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `sound.getLevel()` | Get current smoothed sound level (0-100%) |
| `sound.getRawValue()` | Get raw ADC value (0-4095) |
| `sound.isLoud(float threshold = 50.0)` | Check if sound level exceeds a threshold |

### GroveUltrasonic

**Grove - Ultrasonic Ranger v2.0.** Distance to the nearest object in front of the sensor. Example sketch: [Sensors/GroveUltrasonic](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveUltrasonic/). **Untested on hardware.**

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `distance` | `distance` | `float` | 2 to 350 cm | Distance in centimetres, 2-350. | `25.5` |

**In a sketch.** Needs the Arduino library **Grove Ultrasonic Ranger** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveUltrasonic.h>

GroveUltrasonic distance = {"distance", 32, 200, 1.0};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `pin` | GPIO pin number |
| `updateRateMs` | Minimum ms between measurements |
| `changeThreshold` | Minimum cm change to send |

Optional settings, set before `distance.setup()`, e.g. `distance.calibScale = 1.0;`:

| Setting | Default | Meaning |
|---|---|---|
| `calibScale` | `1.0` | Calibration parameters (for future WebApp calibration) Formula: calibrated = raw * calibScale + calibOffset Scale factor (default: no scaling) |
| `calibOffset` | `0.0` | Offset in cm (default: no offset) |

Call `distance.setup()` in `setup()`, `distance.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `distance.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `distance.getDistance()` | Get current smoothed distance (cm) |
| `distance.getRawDistance()` | Get raw distance measurement (cm) |
| `distance.isWithinRange(float maxDistance)` | Check if an object is within a certain distance |
| `distance.isValidReading()` | Check if measurement is valid (within sensor range) |

### GroveTempHumidity

**Grove - Temperature & Humidity Sensor (DHT11, blue) / Pro (DHT22, white).** Air temperature and relative humidity from one module. Example sketch: [Sensors/GroveTempHumidity](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveTempHumidity/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `climate_temp` | `temperature` | `float` | 0 to 50 celsius | Temperature in degrees Celsius. | `22.5` |
| `climate_humidity` | `humidity` | `float` | 0 to 100 % | Relative humidity in percent. | `41` |

- The sensor can be read at most every 2 s. Both values are re-sent every 10 s even when they don't change.
- For the white Pro module, set `dhtType = DHT22` in the sketch. Tested with the blue DHT11 module v1.2; the DHT22 setting is not yet tested.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveTempHumidity.h>

GroveTempHumidity climate = {"climate", 32, 2000, 0.5, 1.0};
```

| Field, in order | Meaning |
|---|---|
| `name` | Base sensor name for ProtoFlow |
| `pin` | GPIO pin number |
| `updateRateMs` | Minimum ms between reads (>= 2000 for DHT11) |
| `tempThreshold` | Minimum °C change to send |
| `humidityThreshold` | Minimum % RH change to send |

Optional settings, set before `climate.setup()`, e.g. `climate.dhtType = DHT11;`:

| Setting | Default | Meaning |
|---|---|---|
| `dhtType` | `DHT11` | Sensor chip (DHT11 = blue Grove module, DHT22 = white "Pro" module) |
| `tempOffset` | `0.0` | Calibration offsets (added to the raw readings) °C |
| `humidityOffset` | `0.0` | % RH |
| `resendIntervalMs` | `10000` | Send both values at least this often, even if unchanged (0 = only on change). Room temperature can stay within the threshold for a long time, so without this an app that connects later would never receive a temperature value. |
| `serialPrint` | `true` | Print readings and errors to the Serial Monitor (independent of PROTOFLOW_DEBUG_LEVEL) |

Call `climate.setup()` in `setup()`, `climate.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `climate.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `climate.sendTemp()` | Send the current temperature and remember when it was sent |
| `climate.sendHumidity()` | Send the current humidity and remember when it was sent |
| `climate.resendDue(unsigned long lastSentMs)` | True if a value hasn't been sent for resendIntervalMs |
| `climate.getTemperature()` | Get last temperature reading (°C), NAN before the first successful read |
| `climate.getHumidity()` | Get last humidity reading (% RH), NAN before the first successful read |
| `climate.isValidReading()` | Check if at least one reading has succeeded |
| `climate.read()` | Read the sensor into lastTemp / lastHumidity |
| `climate.waitWhile(int level, unsigned long timeoutUs)` | Wait while the data line stays at `level`. |
| `climate.readRaw(uint8_t data[5])` | Low-level DHT protocol: start signal, response, 40 data bits. |

### GroveAccelerometer

**Grove - 3-Axis Digital Accelerometer (±16g, ADXL345).** Acceleration along three axes; at rest it shows gravity, so it also tells tilt. Example sketch: [Sensors/Grove3AxisAccelerometer](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/Grove3AxisAccelerometer/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `accelerometer` | `imu` | `object` | -16 to 16 g | Object `{accel: {x, y, z}}`, each in g. Lying flat and still: about `z = 1`. | `{"accel": {"x": 0.02, "y": -0.01, "z": 1}}` |

- Only one IMU-type sensor per device is supported.

**In a sketch.** Needs the Arduino library **Accelerometer ADXL345** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveAccelerometer.h>

GroveAccelerometer accel = {"accelerometer", 100, 0.05};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `updateRateMs` | Minimum ms between updates |
| `changeThreshold` | Minimum g change to trigger send |

Call `accel.setup()` in `setup()`, `accel.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `accel.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `accel.getAcceleration(float &x, float &y, float &z)` | Get current acceleration values (in g units) |
| `accel.getRawValues(int &x, int &y, int &z)` | Get raw integer values (for debugging) |
| `accel.isInitialized()` | Check if sensor is working |

### GroveGesture

**Grove - Gesture Sensor (PAJ7620).** Recognises hand gestures in front of the sensor. Example sketch: [Sensors/GroveGesture](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Sensors/GroveGesture/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `gesture` | `gesture` | `string` | gesture | One of `up`, `down`, `left`, `right`, `forward`, `backward`, `clockwise`, `counterclockwise`, `wave`. Sent once per detected gesture; there is no initial value. | `"left"` |

**In a sketch.** Needs the Arduino library **Gesture PAJ7620** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveGesture.h>

GroveGesture gesture = {"gesture", 300};
```

| Field, in order | Meaning |
|---|---|
| `name` | Sensor name for ProtoFlow |
| `debounceMs` | Minimum time between gesture reports |

Call `gesture.setup()` in `setup()`, and `gesture.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `gesture.getLastGesture()` | Get the last detected gesture |
| `gesture.isInitialized()` | Check if sensor is working |

## Actuators

### GroveLED

**Grove - LED.** A single LED, on or off. Example sketch: [Actuators/GroveLED](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveLED/).

Actuator `led`: type `led`, data_type `boolean`.

| Send this value | Effect |
|---|---|
| `true` | On |
| `false` | Off |

- On/off only, no brightness. Also accepts `1` / `0` and `"on"` / `"off"`.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveLED.h>

GroveLED led = {"led", 33, false};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `pin` | GPIO pin number |
| `inverted` | true if LED is active-low |

Call `led.setup()` in `setup()`, and `led.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `led.blinkTest(int count = 3, int onMs = 200, int offMs = 200)` | Startup blink test - call after setup() to verify hardware |
| `led.setState(bool state)` | Manually set LED state (bypasses PWA) |
| `led.isOn()` | Get current LED state |
| `led.toggle()` | Toggle LED state |

### GroveLEDBar

**Grove - LED Bar v2.1.** Ten LEDs in a row, for levels and bar graphs. Example sketch: [Actuators/GroveLEDBar](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveLEDBar/).

Actuator `ledbar`: type `led_bar`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"l": 5}` | Level 0-10, lit from one end like a bar graph |
| `{"b": [1, 1, 0, 0, 0, 0, 0, 0, 0, 0]}` | Each of the 10 LEDs on (1) or off (0) |
| `{"i": 3, "s": 1}` | One LED (index 0-9) on (1) or off (0) |
| `{"a": 1}` | All on |
| `{"a": 0}` | All off |

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveLEDBar.h>

GroveLEDBar ledbar = {"ledbar", 17, 16, true};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `clockPin` | Clock pin (DCKI) |
| `dataPin` | Data pin (DI) |
| `greenToRed` | Direction: true = LED 0 is green, LED 9 is red |

Call `ledbar.setup()` in `setup()`, and `ledbar.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `ledbar.send16bits(uint16_t bits)` | Send 16 bits to MY9221 (MSB first) |
| `ledbar.latch()` | Latch data into MY9221 |
| `ledbar.sendLedStates()` | Send LED states to MY9221 chip |
| `ledbar.test()` | Hardware test - cycles through LED bar features |
| `ledbar.setLevel(int level)` | Set level (0-10) - progress bar style |
| `ledbar.setLed(int index, bool state)` | Set individual LED (0-9) |
| `ledbar.setBits(uint16_t bits)` | Set all LEDs from bitmask |
| `ledbar.allOn()` | Turn all LEDs on |
| `ledbar.allOff()` | Turn all LEDs off |
| `ledbar.getBits()` | Get current LED state as bitmask |

### GroveChainableRGB

**Grove - Chainable RGB LED (P9813).** Full-colour LED; several can be chained, and all show the same colour. Example sketch: [Actuators/GroveChainableRGB](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveChainableRGB/).

Actuator `rgb`: type `rgb_led`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"r": 255, "g": 128, "b": 0}` | Colour; each channel 0-255 |
| `{"r": 0, "g": 0, "b": 0}` | Off |

- Only `r`, `g` and `b` reach the device (see the `rgb_led` rule above).

**In a sketch.** Needs the Arduino library **Grove - Chainable RGB LED** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveChainableRGB.h>

GroveChainableRGB rgb = {"rgb", 17, 16, 1};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `dataPin` | DATA (DI) pin |
| `clockPin` | CLOCK (CI) pin |
| `numLeds` | Number of LEDs in chain |

Call `rgb.setup()` in `setup()`, and `rgb.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `rgb.rainbowTest(int delayMs = 300)` | Rainbow test - cycles through colors to verify hardware |
| `rgb.setColor(uint8_t r, uint8_t g, uint8_t b)` | Set color for all LEDs in chain |
| `rgb.setColorAt(int index, uint8_t r, uint8_t g, uint8_t b)` | Set color for a specific LED in chain (0-indexed) |
| `rgb.off()` | Turn off all LEDs |
| `rgb.getColor(uint8_t& r, uint8_t& g, uint8_t& b)` | Get current color |
| `rgb.setColorHSV(float h, float s, float v)` | Set color using HSV (0-360, 0-100, 0-100) |

### GroveRGBLEDStick

**Grove - RGB LED Stick (10 WS2813 Mini LEDs).** Ten full-colour LEDs, each settable on its own. Example sketch: [Actuators/GroveRGBLEDStick](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveRGBLEDStick/).

Actuator `rgbstick`: type `rgb_strip`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"c": {"r": 255, "g": 0, "b": 0}}` | All LEDs one colour |
| `{"i": 3, "c": {"r": 0, "g": 255, "b": 0}}` | One LED (index 0-9) one colour |
| `{"r": 1}` | Rainbow across the stick |
| `{"b": 128}` | Brightness 0-255 |
| `{"o": 1}` | All off |

- The device acts on the first key it recognises, so put one command in each message.

**In a sketch.** Needs the Arduino library **Adafruit NeoPixel** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveRGBLEDStick.h>

GroveRGBLEDStick stick = {"rgbstick", 16, 10};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `dataPin` | Data pin |
| `numLeds` | Number of LEDs (typically 10) |

Call `stick.setup()` in `setup()`, and `stick.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `stick.test()` | Hardware test - cycles through colors and rainbow |
| `stick.setAll(uint8_t r, uint8_t g, uint8_t b)` | Set all LEDs to same color |
| `stick.setPixel(int index, uint8_t r, uint8_t g, uint8_t b)` | Set individual LED color |
| `stick.rainbow()` | Show static rainbow across all LEDs |
| `stick.setBrightness(uint8_t level)` | Set brightness (0-255) |
| `stick.off()` | Turn all LEDs off |

### GroveVibrator

**Grove - Vibration Motor.** Small vibration motor, on or off. Example sketch: [Actuators/GroveVibrator](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveVibrator/).

Actuator `vibrator`: type `buzzer`, data_type `boolean`.

| Send this value | Effect |
|---|---|
| `true` | Vibrate |
| `false` | Stop |

- Registers as type `buzzer`, so don't combine it with `GroveBuzzer` on one device.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveVibrator.h>

GroveVibrator vibrator = {"vibrator", 16};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `pin` | GPIO pin number |

Call `vibrator.setup()` in `setup()`, and `vibrator.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `vibrator.pulseTest(int count = 3, int onMs = 100, int offMs = 100)` | Startup pulse test - call after setup() to verify hardware |
| `vibrator.setState(bool state)` | Manually set vibrator state (bypasses PWA) |
| `vibrator.on()` | Turn on vibrator |
| `vibrator.off()` | Turn off vibrator |
| `vibrator.isOn()` | Get current vibrator state |
| `vibrator.toggle()` | Toggle vibrator state |
| `vibrator.pulse(int durationMs = 200)` | Single pulse vibration |
| `vibrator.pattern(const int* patternMs, int length)` | Vibration pattern for haptic feedback |
| `vibrator.hapticShort()` | Short haptic feedback (like phone notification) |
| `vibrator.hapticDouble()` | Double haptic feedback |
| `vibrator.hapticLong()` | Long haptic feedback |

### GroveBuzzer

**Grove - Buzzer.** Loud beeper at a fixed pitch (about 2.3 kHz). Example sketch: [Actuators/GroveBuzzer](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveBuzzer/). **Untested on hardware.**

Actuator `buzzer`: type `buzzer`, data_type `boolean`.

| Send this value | Effect |
|---|---|
| `true` | Sound |
| `false` | Silence |

- Switches itself off after 5 s (`maxOnMs` in the sketch).
- Registers as type `buzzer`, so don't combine it with `GroveVibrator` on one device.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveBuzzer.h>

GroveBuzzer buzzer = {"buzzer", 16};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `pin` | GPIO pin number |

Optional settings, set before `buzzer.setup()`, e.g. `buzzer.maxOnMs = 5000;`:

| Setting | Default | Meaning |
|---|---|---|
| `maxOnMs` | `5000` | Safety: turn off automatically if switched on from the PWA and never switched off (e.g. the page was closed). 0 = no limit. |
| `serialPrint` | `true` | Print commands to the Serial Monitor (independent of PROTOFLOW_DEBUG_LEVEL) |

Call `buzzer.setup()` in `setup()`, and `buzzer.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `buzzer.beepTest(int count = 2, int onMs = 80, int offMs = 80)` | Startup beep test - call after setup() to verify hardware |
| `buzzer.setState(bool state)` | Manually set buzzer state (bypasses PWA) |
| `buzzer.on()` | Turn on buzzer (continuous ~2300 Hz) |
| `buzzer.off()` | Turn off buzzer |
| `buzzer.isOn()` | Get current buzzer state |
| `buzzer.toggle()` | Toggle buzzer state |
| `buzzer.beep(int durationMs = 100)` | Single beep (BLOCKING for durationMs) |
| `buzzer.beeps(int count, int onMs = 100, int offMs = 100)` | Several beeps in a row (BLOCKING) |
| `buzzer.playTone(unsigned int frequency, int durationMs)` | Play a tone at a given pitch (BLOCKING for durationMs) |
| `buzzer.chirpUp()` | Rising two-tone chirp (e.g. "connected", "success") |
| `buzzer.chirpDown()` | Falling two-tone chirp (e.g. "disconnected", "error") |
| `buzzer.toBool(JsonVariant value)` | Convert a command value from the PWA to on/off |

### GroveSpeaker

**Grove - Speaker.** Plays notes at a chosen pitch; louder and lower than the buzzer. Example sketch: [Actuators/GroveSpeaker](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveSpeaker/). **Untested on hardware.**

Actuator `speaker`: type `tone_buzzer`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"frequency": 262, "duration": 500}` | Play a note: frequency in Hz, duration in ms (at most 5 s) |
| `{"frequency": 0, "duration": 0}` | Stop |

- Send both fields (see the `tone_buzzer` rule above).
- Needs 5 V. Low notes sound best; the volume knob is on the board.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveSpeaker.h>

GroveSpeaker speaker = {"speaker", 16};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `pin` | GPIO pin number |

Optional settings, set before `speaker.setup()`, e.g. `speaker.maxNoteMs = 5000;`:

| Setting | Default | Meaning |
|---|---|---|
| `maxNoteMs` | `5000` | Safety: no single note plays longer than this (ms) |
| `defaultNoteMs` | `500` | Length used when the PWA sends a note without a duration (ms) |
| `serialPrint` | `true` | Print commands to the Serial Monitor (independent of PROTOFLOW_DEBUG_LEVEL) |

Call `speaker.setup()` in `setup()`, and `speaker.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `speaker.handleCommand(JsonVariant value)` | Handle a command from the PWA |
| `speaker.playNote(unsigned int frequency, unsigned long durationMs)` | Play one note in the background (NON-BLOCKING) |
| `speaker.playMelody(const SpeakerNote* notes, int count)` | Play a melody in the background (NON-BLOCKING) |
| `speaker.stop()` | Stop any sound right away |
| `speaker.playTest()` | Startup test - plays Do-Mi-Sol (BLOCKING, ~0.6 s) |
| `speaker.isPlaying()` | Check if a note or melody is playing |
| `speaker.getFrequency()` | Get the pitch currently playing (Hz), 0 when silent |
| `speaker.startNote(unsigned int frequency, unsigned long durationMs)` | Start a note and remember when it should end (internal helper) |

### Grove4DigitDisplay

**Grove - 4-Digit Display (TM1637).** Four 7-segment digits with a colon. Example sketch: [Actuators/Grove4DigitDisplay](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/Grove4DigitDisplay/).

Actuator `display`: type `display`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"n": 1234}` | Number 0-9999 |
| `{"t": [12, 30]}` | Time with the colon: 12:30 |
| `{"s": "HELO"}` | Text; only characters a 7-segment display can show |
| `{"c": 1}` | Clear |
| `{"b": 7}` | Brightness 0-7 |

**In a sketch.** Needs the Arduino library **Grove 4-Digit Display** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/Grove4DigitDisplay.h>

Grove4DigitDisplay display = {"display", 16, 17};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |
| `clkPin` | Clock pin |
| `dioPin` | Data I/O pin |

Call `display.setup()` in `setup()`, and `display.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `display.displayNumber(TM1637* disp, int num, bool leadingZeros)` | Display a number on the 4-digit display |
| `display.charToDisplayCode(char c)` | Convert character to TM1637 display code |
| `display.test()` | Hardware test - cycles through display features |
| `display.showNumber(int num)` | Show a number (0-9999) |
| `display.showTime(int hours, int minutes)` | Show time with colon |
| `display.showText(const char* text)` | Show text (up to 4 characters) |
| `display.clear()` | Clear the display |
| `display.setBrightness(uint8_t level)` | Set brightness (0-7) |

### GroveLCDRGB

**Grove - LCD RGB Backlight v4.0 (16 x 2 characters).** Two lines of text with a colour backlight. Example sketch: [Actuators/GroveLCDRGB](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveLCDRGB/).

Actuator `lcd`: type `lcd_rgb`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"t": ["Line 1", "Line 2"]}` | Both lines, 16 characters each |
| `{"t": "Hello", "l": 0}` | One line: `l` = 0 (top) or 1 (bottom) |
| `{"r": 255, "g": 128, "b": 0}` | Backlight colour; each channel 0-255 |
| `{"c": 1}` | Clear |
| `{"bl": 0}` | Backlight off |
| `{"bl": 1}` | Backlight on, previous colour |

**In a sketch.** Needs the Arduino library **Grove - LCD RGB Backlight** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveLCDRGB.h>

GroveLCDRGB lcd = {"lcd"};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |

Call `lcd.setup()` in `setup()`, and `lcd.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `lcd.sendLCDCommand(uint8_t addr, uint8_t cmd)` |  |
| `lcd.sendLCDData(uint8_t addr, uint8_t data)` |  |
| `lcd.writeLCDString(uint8_t addr, const char* str)` |  |
| `lcd.test()` | Hardware test - cycles through display and color features |
| `lcd.print(int line, const char* text)` | Display text on a specific line |
| `lcd.print(const char* line0, const char* line1)` | Display text on both lines |
| `lcd.setColor(uint8_t red, uint8_t green, uint8_t blue)` | Set backlight color |
| `lcd.setBacklight(bool on)` | Turn backlight on/off |
| `lcd.clear()` | Clear the display |

### GroveOLED

**Grove - OLED Display 0.96" (128 x 64 pixels).** Small monochrome screen for text and a progress bar. Example sketch: [Actuators/GroveOLED](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Actuators/GroveOLED/).

Actuator `oled`: type `oled`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"t": ["Line 1", "Line 2", "Line 3"]}` | Several lines, placed automatically |
| `{"t": "Hello", "x": 0, "y": 20}` | Text at a pixel position |
| `{"c": 1}` | Clear |
| `{"i": 1}` | Inverted colours |
| `{"i": 0}` | Normal colours |
| `{"progress": 75}` | Progress bar 0-100 % |
| `{"f": 2}` | Font size: 1 small, 2 medium, 3 large |

**In a sketch.** Needs the Arduino library **U8g2** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveOLED.h>

GroveOLED oled = {"oled"};
```

| Field, in order | Meaning |
|---|---|
| `name` | Actuator name for ProtoFlow |

Call `oled.setup()` in `setup()`, and `oled.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `oled.test()` | Hardware test - displays test patterns |
| `oled.print(int x, int y, const char* text)` | Display text at a specific position |
| `oled.printLines(const char** lines, int count)` | Display multiple lines of text |
| `oled.showProgress(int percent)` | Display a progress bar |
| `oled.clear()` | Clear the display |
| `oled.setFontSize(int size)` | Set font size (1=small, 2=medium, 3=large) |
| `oled.setInverted(bool inv)` | Invert display colors |

## Sensor and actuator in one module

### GroveLEDButton

**Grove - Yellow / Red LED Button.** Push button with a built-in LED that the web app can switch. Example sketch: [Bidirectional/GroveLEDButton](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Bidirectional/GroveLEDButton/). **Untested on hardware.**

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `button` | `digital` | `boolean` | — | `true` while pressed, `false` when released. | `true` |

Actuator `led`: type `led`, data_type `boolean`.

| Send this value | Effect |
|---|---|
| `true` | LED on |
| `false` | LED off |

- Its LED is type `led`, so don't combine it with `GroveLED` on one device.

**In a sketch.** Needs no extra library. From the example sketch, with its pins:

```cpp
#include <components/GroveLEDButton.h>

GroveLEDButton ledButton = {"button", "led", 17, 16, 50};
```

| Field, in order | Meaning |
|---|---|
| `buttonName` | Sensor name for button |
| `ledName` | Actuator name for LED |
| `buttonPin` | GPIO pin for button (SIG2) |
| `ledPin` | GPIO pin for LED (SIG1) |
| `debounceMs` | Debounce time in milliseconds (default: 50) |

Call `ledButton.setup()` in `setup()`, `ledButton.sendInitial()` when registration is accepted (in `ProtoFlow.onRegistration`), and `ledButton.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `ledButton.setLED(bool state)` | Set LED state directly (can be called from code) |
| `ledButton.toggleLED()` | Toggle LED state |
| `ledButton.getLEDState()` | Get current LED state |
| `ledButton.isPressed()` | Get current button state |
| `ledButton.followButton()` | Enable "follow mode" - LED mirrors button state |

### GroveMP3

**Grove - MP3 v4.0 (WT2605CX).** Plays MP3 files from an SD card and reports what it is doing. Example sketch: [Bidirectional/GroveMP3](https://github.com/Aalto-ProtoFlow/protoflow/tree/main/firmware/examples/Bidirectional/GroveMP3/).

| Sensor name | type | data_type | Range | Value received | Example |
|---|---|---|---|---|---|
| `mp3_status` | `mp3_status` | `object` | — | Object `{playing, volume, mode}`, every 2 s while status reporting is on. | `{"playing": true, "volume": 20, "mode": "loop"}` |

Actuator `mp3`: type `mp3_player`, data_type `object`.

| Send this value | Effect |
|---|---|
| `{"cmd": "play"}` | Play or resume |
| `{"cmd": "pause"}` | Pause (works like toggle) |
| `{"cmd": "toggle"}` | Play / pause |
| `{"cmd": "stop"}` | Stop |
| `{"cmd": "next"}` | Next track |
| `{"cmd": "prev"}` | Previous track |
| `{"cmd": "volume", "value": 15}` | Volume 0-31 |
| `{"cmd": "vol_up"}` | Volume up |
| `{"cmd": "vol_down"}` | Volume down |
| `{"cmd": "mode", "value": "loop"}` | Play mode: `loop`, `repeat`, `folder`, `random` or `single` |
| `{"cmd": "track", "index": 3}` | Track number 3 from the SD card's root |
| `{"cmd": "track", "name": "song"}` | song.mp3 from the SD card's root |
| `{"cmd": "folder", "folder": "01", "index": 5}` | Track 5 from folder 01 |

- Needs an SD card (FAT32) with MP3 files.
- The header comment also lists `currentTime` and `totalTime` in the status, but the code doesn't send them.

**In a sketch.** Needs the Arduino libraries **Seeed Serial MP3 Player** and **EspSoftwareSerial** (Library Manager). From the example sketch, with its pins:

```cpp
#include <components/GroveMP3.h>

GroveMP3 mp3 = {"mp3", "mp3_status", 16, 17};
```

| Field, in order | Meaning |
|---|---|
| `actuatorName` | Actuator name for control commands |
| `sensorName` | Sensor name for status reporting |
| `rxPin` | ESP32 RX pin <- MP3 TX |
| `txPin` | ESP32 TX pin -> MP3 RX |

Optional settings, set before `mp3.setup()`, e.g. `mp3.enableStatusReporting = true;`:

| Setting | Default | Meaning |
|---|---|---|
| `enableStatusReporting` | `true` | Options Default ON for bidirectional |
| `statusInterval` | `2000` | ms between status reports (2 seconds) |

Call `mp3.setup()` in `setup()`, and `mp3.loop()` in `loop()`.

Other methods, for logic on the board itself:

| Method | What it does |
|---|---|
| `mp3.parseModeName(const char* modeName)` | Parse mode name string to enum |
| `mp3.getModeString(GroveMP3PlayMode mode)` | Get mode name string from enum |
| `mp3.sendStatus()` | Send current status to PWA |
| `mp3.test()` | Hardware test - plays first track briefly |
| `mp3.toggle()` | Toggle play/pause |
| `mp3.play()` | Start/resume playback |
| `mp3.pause()` | Pause playback |
| `mp3.stop()` | Stop playback |
| `mp3.next()` | Next track |
| `mp3.previous()` | Previous track |
| `mp3.setVolume(uint8_t vol)` | Set volume (0-31) |
| `mp3.volumeUp()` | Increase volume |
| `mp3.volumeDown()` | Decrease volume |
| `mp3.setMode(GroveMP3PlayMode mode)` | Set play mode by enum |
| `mp3.setMode(const char* modeName)` | Set play mode by name string |
| `mp3.playTrack(uint32_t index)` | Play track by index (1-based) |
| `mp3.playTrack(const char* filename)` | Play track by filename (without extension) |
| `mp3.playFolderTrack(const char* folder, uint16_t index)` | Play track from specific folder |
| `mp3.getVolume()` | Get current volume |
| `mp3.getIsPlaying()` | Check if playing |
| `mp3.getMode()` | Get current play mode |

---

# File: docs/guides/add-custom-sensor.md


## What you'll build

You will connect a Grove module that has no built-in ProtoFlow component, the Grove Capacitive Moisture Sensor, register it with the ProtoFlow firmware library, stream its readings to your web app, and then build a React visualization for it. The same steps work for a value the board computes itself, such as whether an LED is on (see [A value computed on the board](#a-value-computed-on-the-board)).

**Use this guide only when there is no component for your module.** The modules in [components.md](../components.md) each have a component class (`GroveLED`, `GroveTempHumidity`, ...) that registers and sends for you; use those instead.

## Prerequisites

- ESP32 with the ProtoFlow firmware library installed
- A Grove Capacitive Moisture Sensor: yellow wire (signal) to GPIO 32, red to 3V3, black to GND. Power it from 3V3 so its output stays within what the ESP32 can read
- A ProtoFlow server: your team server, or the whole platform running locally
- `config.h` created from `config.example.h`, with your WiFi and the server's `/ws/device` address
- For steps 3–4: the React starter app running (`npm run dev` in `react/`)

> **Roles**: Steps 1–2 are **firmware developer** work. Steps 3–4 are **frontend developer** work and can start as soon as the sensor's name is agreed.

## Steps

### 1. Register the sensor and send its readings

Start from your board's sketch (in the student starter: `firmware/TeamDevice/TeamDevice.ino`) and add the parts marked `NEW`. The connection code stays as it is.

```cpp
#include <ProtoFlow.h>
#include "config.h"

#define DEVICE_NAME "Plant monitor"

// NEW: the moisture sensor. Analog modules need GPIO 32-39: the other analog pins stop working while WiFi is on.
const int MOISTURE_PIN = 32;
const int DRY_RAW = 3000;   // reading in dry air: replace with yours (step 2)
const int WET_RAW = 1300;   // reading in a glass of water: replace with yours (step 2)
const unsigned long SEND_INTERVAL_MS = 5000;
unsigned long lastSendMs = 0;

// NEW: soil moisture in percent, 0 = as dry as air, 100 = as wet as water
float readMoisture() {
    int raw = analogRead(MOISTURE_PIN);
    Serial.printf("moisture raw: %d\n", raw);
    float percent = (DRY_RAW - raw) * 100.0f / (DRY_RAW - WET_RAW);
    return constrain(percent, 0.0f, 100.0f);
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    ProtoFlow.configureDevice(DEVICE_NAME, "ESP32");

    // NEW: register the sensor before ProtoFlow.begin()
    //                  name        type        data_type  min  max  unit  description
    ProtoFlow.addSensor("moisture", "moisture", "float",   0,   100, "%",  "Soil moisture");

    ProtoFlow.configureWiFi(WIFI_SSID, WIFI_PASSWORD);
    ProtoFlow.configureWebSocket(WEBSOCKET_URL, ROOT_CA_CERT);

    ProtoFlow.onConnect([]() {
        ProtoFlow.sendDeviceRegistration();
    });

    ProtoFlow.onRegistration([](bool accepted, String message) {
        if (accepted) {
            // NEW: the first reading right away, so apps don't wait for the interval
            ProtoFlow.sendSensorData("moisture", readMoisture());
        } else {
            PF_ERROR("Registration failed: " + message);
        }
    });

    ProtoFlow.begin();
}

void loop() {
    ProtoFlow.update();

    if (!ProtoFlow.isOperational()) {
        delay(10);
        return;
    }

    // NEW: a reading every few seconds
    if (millis() - lastSendMs >= SEND_INTERVAL_MS) {
        lastSendMs = millis();
        ProtoFlow.sendSensorData("moisture", readMoisture());
    }
}
```

Key firmware API calls:
- `ProtoFlow.addSensor(name, type, dataType, min, max, unit, description)`: registers the sensor. Call it in `setup()`, before `ProtoFlow.begin()`.
- `ProtoFlow.sendSensorData(name, value)`: sends a reading. `value` is a `float`, a `bool` or a `JsonObject`. Nothing is sent until the registration has been accepted, which is why the first reading goes in `onRegistration`.

### 2. Calibrate and check the data

Upload the sketch and open the Serial Monitor at 115200 baud. Wait for `Registration ACCEPTED`, then:

1. Hold the sensor in the air and note the `moisture raw:` value. That is `DRY_RAW`.
2. Put its tip in a glass of water, keeping the electronics at the top dry, and note the value again. That is `WET_RAW`.
3. Put both numbers in the sketch and upload again. The formula works whichever of the two is larger.

Then check that the readings arrive:
- **Node-RED**: the debug sidebar shows the board's messages under **Device RAW**, here as `{"s":"moisture","v":42.5}`
- **Plain HTML**: `html/index.html` shows a `moisture` value
- **React app**: the dashboard shows a **moisture** card with a plain number. This is the `GenericViz` fallback, which works for any sensor without frontend changes

### 3. Create a visualization component

Create `react/src/components/sensors/MoistureViz.jsx`:

```jsx
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

function getLabel(percent) {
  if (percent < 30) return 'Dry: water me';
  if (percent < 70) return 'OK';
  return 'Wet';
}

export default function MoistureViz({ value, unit }) {
  const hasValue = typeof value === 'number';
  const percent = hasValue ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tabular-nums">{hasValue ? value.toFixed(0) : '--'}</span>
        <span className="text-sm text-muted-foreground">{unit || '%'}</span>
      </div>
      <Progress value={percent} className="h-2 w-full" />
      <Badge variant="secondary">{hasValue ? getLabel(percent) : 'no data yet'}</Badge>
    </div>
  );
}
```

### 4. Register the component in the sensor registry

Open `react/src/components/sensors/registry.js` and add your import and pattern entry:

```javascript
import SliderViz from './SliderViz.jsx';
import GenericViz from './GenericViz.jsx';
import MoistureViz from './MoistureViz.jsx';

const PATTERNS = [
  { match: /slider|potentiometer|rotary/, component: SliderViz },
  { match: /moisture/, component: MoistureViz },
  // Add more custom visualizations here
];
```

`getSensorComponent()` builds a lookup key from `"sensorName sensorType"` (lowercased) and tests each pattern in order. The first match wins; if nothing matches, it uses `GenericViz`.

## Verify it works

1. The Serial Monitor shows `moisture raw:` values and no errors
2. The React dashboard's moisture card shows a number, a bar and a label
3. Water the soil (or dip the sensor) and watch the value rise within a few seconds

## Rules for your own sensors

- **Name**: the first `addSensor` argument is the name web apps receive. Keep it unique on the board, lowercase, without spaces.
- **Type**: if one in this table fits, use it, and the reading travels in a short compact form: `temperature`, `humidity`, `light`, `pressure`, `distance`, `analog`, `digital`, `motion`, `sound`, `gas`, `voltage`, `current`. Any other word works too (`moisture` here); the reading then travels as JSON. Web pages pick a display from the type and the name, so choose words that say what it is.
- **Data type**: `float` or `int` for numbers, `boolean` for on/off. `min` and `max` tell apps the range.
- **Rate**: send on change or every few seconds, not on every `loop()`.
- **Network**: never write your own WiFi, WebSocket, HTTP or MQTT code. `addSensor` and `sendSensorData` are the only way in.

## A value computed on the board

A sensor doesn't have to be a module. Anything the board knows can be sent the same way, for example whether an LED is on. With `GroveLED led` from the template:

```cpp
// in setup(), before ProtoFlow.begin()
ProtoFlow.addSensor("led_on", "state", "boolean", 0, 1, "", "LED is on");

// in onRegistration, when accepted: the current state, for pages that connect later
ProtoFlow.sendSensorData("led_on", led.isOn());

// in loop(), after led.loop(): send when it changes
static bool lastLedOn = false;
if (led.isOn() != lastLedOn) {
    lastLedOn = led.isOn();
    ProtoFlow.sendSensorData("led_on", lastLedOn);
}
```

Web pages then receive `led_on` as `true` / `false`, whether the LED was switched from a page or on the board.

## Next steps

- [Add a Custom Visualization](./add-custom-visualization.md): more styling with shadcn/ui, Progress bars and color gradients
- [Add a Custom Actuator](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-custom-actuator.md): control hardware from your web app
- [Add a Backend Route](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-backend-route.md): store and query custom data

---

# File: docs/javascript-api.md


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
