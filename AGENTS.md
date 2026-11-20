# AGENTS.md

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
| `docs/guides/` | How-tos: a sensor or value without a component (`add-custom-sensor.md`), an actuator without a component (`add-custom-actuator.md`), a React visualization, a new React page |
| `TEAM-GUIDE.md` | For people: the team server's addresses, the Node-RED editor, setting up Arduino IDE and flashing the ESP32s |
| `AI-CONTEXT.md` | Generated copy of this file and the main docs, for AI chat tools that can't see the repository. Don't edit it |
| `TEAM-NOTES.md` | If it exists: what is true only for this team (see below) |

## Team notes

This file is the same for every team and changes when the starter is updated. What is true only for this team goes in `TEAM-NOTES.md` at the repository root: which pin each module is wired to, modules and other hardware without a component, extra Arduino libraries, and decisions the team has made. Read it, if it exists, before changing a sketch or a page. When the user tells you such a fact, add it there, creating the file if needed, and not to this file.

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
2. Use each module only through its component class from `docs/components.md` (`GroveLED`, `GroveTempHumidity`, ...). Never drive a module's pin with `digitalWrite()`, `analogRead()` or similar, and never write your own WiFi, WebSocket, HTTP or MQTT code: the class is what makes the module visible to Node-RED and the web app, and what turns their commands into pin changes. Only for a module that has no class, follow a guide, and use the module's own Arduino library if it has one: for something the board reads, or a value it computes itself (such as whether the LED is on), `docs/guides/add-custom-sensor.md` (`ProtoFlow.addSensor`, `ProtoFlow.sendSensorData`); for something the board drives, such as a servo or a display, `docs/guides/add-custom-actuator.md` (`ProtoFlow.addActuator`, `ProtoFlow.onActuator`).
3. Ask the user which pin each module is wired to, unless `TEAM-NOTES.md` says; don't guess, and don't silently keep the example's pin. Every module needs its own pin. Analog modules need GPIO 32-39 (the other analog pins stop working while WiFi is on). GPIO 34-39 are input only, so no actuator can use them. Never use GPIO 6-11 (the board's flash memory), and avoid 0, 1, 2, 3, 12 and 15 (1 and 3 are the USB serial port; the others decide how the board starts). I²C modules share SDA 21 and SCL 22; SPI modules use SCK 18, MISO 19 and MOSI 23.
4. Each module needs `x.setup()` in `setup()` and `x.loop()` in `loop()`; sensors also need `x.sendInitial()` in the `onRegistration` callback. The name in the declaration (`"led"`, `"climate"`) is the name the web app uses: keep the sketch and the pages consistent.
5. If a module needs an extra Arduino library, tell the user to install it (Arduino IDE: Tools > Manage Libraries).
6. `config.h` (WiFi password, server address) is gitignored and stays out of the repository. Create it from `config.example.h` in the sketch's folder; the server address is `wss://YOUR-TEAM.proto.aalto.fi/ws/device`.
7. One sketch per board. For another board, copy the folder and give the folder and the `.ino` file the same new name (Arduino requires it), and a new `DEVICE_NAME`.
8. One board can control another: `ProtoFlow.sendCommand("Other board", "buzzer", true)` sends the same command a web page would to the board with that `DEVICE_NAME` (or UUID), through the team server, with no page open. Every board needs its own `DEVICE_NAME`. Send on change, not on every `loop()`. The value is what the target's actuator expects (`docs/components.md`, or its sketch). Details: `docs/guides/add-custom-actuator.md`, "A command from another board".

## Check your work

- HTML: open the page in a browser and watch the browser console.
- React: `npm run dev` while developing; `npm run build` must succeed before publishing.
- Sketches: if `arduino-cli` is available, `arduino-cli compile --fqbn esp32:esp32:esp32 firmware/<Sketch>` must succeed. Otherwise ask the user to upload it in Arduino IDE and to paste the Serial Monitor output: it should show `WiFi connected`, `WebSocket connected` and `Registration ACCEPTED`.
- Live data needs a powered device connected to the team server. If none is connected, the device list is empty; ask the user to switch one on.
