# AGENTS.md

Instructions for AI coding assistants working in this repository. People: start with README.md.

## What this is

The web app for one team's ProtoFlow prototype. ProtoFlow connects ESP32 boards with Grove sensors and actuators to web pages:

- ESP32 boards run Arduino sketches and connect to the team server over WiFi.
- The team server, `YOUR-TEAM.proto.aalto.fi`, runs Node-RED, which relays live data and commands, and a backend for accounts, devices and history.
- This app runs in the browser and talks only to the team server: live data and commands over WebSocket at `wss://YOUR-TEAM.proto.aalto.fi/ws/app`, accounts and history over HTTPS at `https://YOUR-TEAM.proto.aalto.fi/api`.

The app is static files. It is not deployed to the team server: people open it from disk or host it on GitHub Pages, Vercel or Netlify (see README.md).

## Layout

| Path | What |
|---|---|
| `html/` | Plain HTML pages, no build step. `index.html` is the smallest complete page; `viewer-multi.html`, `controller.html` and `bidirectional.html` are larger references |
| `react/` | React 19 app (Vite, React Router 7, Tailwind CSS 4, shadcn/ui, Chart.js): login, devices, live dashboard, history, settings |
| `docs/components.md`, `docs/components.json` | Every Grove component: sensor names and values, actuator commands |
| `docs/javascript-api.md` | The connector library, `protoflow.js` |
| `docs/protocol.md` | Messages between the app and Node-RED |
| `docs/api-reference.md` | Backend REST API: accounts, devices, measurements, alerts, commands |

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

## Check your work

- HTML: open the page in a browser and watch the browser console.
- React: `npm run dev` while developing; `npm run build` must succeed before publishing.
- Live data needs a powered device connected to the team server. If none is connected, the device list is empty; ask the user to switch one on.
