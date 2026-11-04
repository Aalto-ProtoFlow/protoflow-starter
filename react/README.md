> **In this starter** the server addresses are already set in `.env`: see [../README.md](../README.md). The localhost addresses below are for running the whole platform on your own computer.

# ProtoFlow Starter App

A full-stack React starter for your IoT product proof of concept. Built with **Tailwind CSS v4** and **shadcn/ui** components. Fork this, customize it, make it yours.

## What's Included

- **Login & registration** — JWT auth against the backend
- **Device management** — claim devices by UUID, see your device list
- **Live dashboard** — real-time sensor data via WebSocket (protoflow.js)
- **History charts** — time-series data from the backend API using Chart.js
- **Settings & alerts** — rename devices, set threshold alert rules
- **Sensor registry** — auto-detect visualizations by sensor name (easy to extend)
- **Tailwind CSS v4** — utility-first styling with CSS variables for theming
- **shadcn/ui components** — Button, Card, Input, Label, Switch, Badge, Progress

## Quick Start

### Prerequisites

- Node.js 20+ installed
- The ProtoFlow backend running (see `backend/README.md`)
- NodeRED running with ProtoFlow flows (see `broker/README.md`)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure URLs

Copy `.env.example` to `.env` and edit the URLs:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:1880/ws/app
```

### 3. Start the dev server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Start the backend

In a separate terminal:

```bash
cd backend
npm install
npm run dev
```

The database is created automatically at `backend/data/protoflow.db`.

## Project Structure

```
src/
  main.jsx                    App entry point (router + auth provider)
  App.jsx                     Route definitions
  index.css                   Tailwind v4 + shadcn theme (CSS variables)

  lib/
    utils.js                  cn() helper for merging Tailwind classes
    protoflow.js              WebSocket client (do not modify)
    api.js                    HTTP client with JWT auth

  hooks/
    useAuth.jsx               Auth context (login, register, logout, user)
    useProtoFlow.js           WebSocket hook (connect, subscribe, sensorData)

  pages/
    LoginPage.jsx             Login + register forms
    DevicesPage.jsx           Device list + claim by UUID
    DashboardPage.jsx         Live sensor data (WebSocket)
    HistoryPage.jsx           Chart.js time-series (HTTP API)
    SettingsPage.jsx          Device name, visibility, alert rules

  components/
    Layout.jsx                Nav bar + page outlet
    ProtectedRoute.jsx        Redirects to /login if not authenticated
    DeviceCard.jsx            Device info card
    SensorDisplay.jsx         Auto-detected sensor visualization
    SensorChart.jsx           Chart.js line chart wrapper
    AlertRuleForm.jsx         Alert rule creation form
    ui/                       shadcn/ui components (don't edit these directly)
      button.jsx, card.jsx, input.jsx, label.jsx,
      switch.jsx, badge.jsx, progress.jsx
    sensors/
      registry.js             Sensor name → component mapping
      GenericViz.jsx           Fallback: raw number display
      SliderViz.jsx           Slider/potentiometer: progress bar
```

## Import Alias

This project uses `@/` as an import alias for `./src/`. Use it in your imports:

```js
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

Configured in `vite.config.js` and `jsconfig.json`.

## useProtoFlow Hook

The `useProtoFlow` hook (`src/hooks/useProtoFlow.js`) bridges the ProtoFlow WebSocket client into React state. It reads the WebSocket URL from the `VITE_WS_URL` environment variable.

```js
const { status, devices, sensorData, connect, disconnect, subscribe, sendCommand } = useProtoFlow();
```

| Return Value | Type | Description |
|-------------|------|-------------|
| `status` | `string` | Connection state: `"disconnected"`, `"connecting"`, or `"connected"` |
| `devices` | `Array` | List of devices from NodeRED (updates on connect/reconnect) |
| `sensorData` | `object \| null` | Latest sensor reading: `{ device, sensor, value, timestamp }` |
| `connect()` | `function` | Open the WebSocket connection |
| `disconnect()` | `function` | Close the connection and clear state |
| `subscribe(uuid)` | `function` | Subscribe to a device's sensor data (auto-unsubscribes from previous) |
| `sendCommand(uuid, actuator, value)` | `function` | Send an actuator command via WebSocket |

**Typical usage** (in `DashboardPage.jsx`):

```jsx
const { status, sensorData, connect, subscribe, sendCommand } = useProtoFlow();

useEffect(() => { connect(); }, []);
useEffect(() => { if (status === 'connected') subscribe(deviceUuid); }, [status]);
```

The hook manages a single device subscription at a time — calling `subscribe()` with a new UUID automatically unsubscribes from the previous one.

## HTTP Client (api.js)

The `api.js` module (`src/lib/api.js`) wraps `fetch()` with JWT authentication and JSON handling. It reads the base URL from the `VITE_API_URL` environment variable (defaults to `http://localhost:3000/api`).

| Method | Signature | Description |
|--------|-----------|-------------|
| `api.get(path)` | `GET /api{path}` | Fetch data |
| `api.post(path, body)` | `POST /api{path}` | Create or send |
| `api.patch(path, body)` | `PATCH /api{path}` | Update |
| `api.delete(path)` | `DELETE /api{path}` | Remove |

All methods automatically attach the JWT token from `localStorage` and throw on non-2xx responses:

```js
import api from '../lib/api.js';

try {
  const devices = await api.get('/devices');
  await api.post('/commands/send', { deviceId: 1, actuator: 'led', value: 1 });
} catch (err) {
  console.error(err.message, err.status); // "Device not found" 404
}
```

## Styling with Tailwind CSS

All styling uses [Tailwind CSS v4](https://tailwindcss.com/docs) utility classes. No separate CSS files needed.

**Theme colors** are defined as CSS variables in `src/index.css` and referenced as Tailwind classes:

```jsx
<p className="text-muted-foreground">Subtle text</p>
<div className="bg-card border rounded-xl">Card-like container</div>
<span className="text-destructive">Error message</span>
```

**The `cn()` helper** merges Tailwind classes and resolves conflicts:

```jsx
import { cn } from '@/lib/utils';

<div className={cn('px-4 py-2', isActive && 'bg-secondary')} />
```

## shadcn/ui Components

The `components/ui/` directory contains pre-built components from [shadcn/ui](https://ui.shadcn.com/). To add more:

```bash
npx shadcn@latest add dialog
```

This generates a new file in `components/ui/` that you can use immediately. Browse the [component library](https://ui.shadcn.com/docs/components) for options.

**Configuration**: `components.json` at the project root controls shadcn settings (JSX, no TypeScript, new-york style, neutral color scheme).

## How to Customize

### Add a custom sensor visualization

1. Create a new component in `src/components/sensors/` (e.g., `TemperatureViz.jsx`)
2. Add an entry to `src/components/sensors/registry.js`:
   ```js
   import TemperatureViz from './TemperatureViz.jsx';
   // In PATTERNS array:
   { match: /temperature|temp/, component: TemperatureViz },
   ```
3. Your component receives `{ value, unit }` as props

### Add a new page

1. Create a page component in `src/pages/`
2. Add a route in `App.jsx`
3. Add a nav link in `Layout.jsx` if needed

### Add a backend endpoint

1. Create a route file in `backend/src/routes/`
2. Mount it in `backend/src/index.js`
3. Call it from the frontend using `api.get()` / `api.post()` from `src/lib/api.js`

## How to Replace Parts

Every part of this template is replaceable:

- **Swap chart library**: Replace `react-chartjs-2` in `SensorChart.jsx` with Recharts, D3, or any other library
- **Swap auth**: Replace `useAuth.jsx` and `api.js` with Firebase Auth, Auth0, or Supabase
- **Swap state management**: The app uses React Context + hooks. Switch to Zustand, Jotai, or Redux if needed
- **Swap styling**: Tailwind classes are in the JSX — replace with CSS modules, styled-components, or plain CSS
- **Add a component library**: shadcn/ui components are just files in your project — add, remove, or replace freely

## Two Data Paths

This template uses two data paths simultaneously:

| Path | Used for | How |
|------|----------|-----|
| **WebSocket** | Live sensor values | `useProtoFlow()` hook → `DashboardPage` |
| **HTTP API** | History, devices, settings, auth | `api.js` → all other pages |

The WebSocket connects to NodeRED for real-time data. The HTTP API connects to the Express backend for everything persistent.

## Dark Mode

The CSS variables in `index.css` include a `.dark` theme. To enable dark mode, add the `dark` class to `<html>`:

```js
document.documentElement.classList.add('dark');
```

No dark mode toggle is included — add one if your product needs it.

## Deployment

```bash
npm run build
```

The `dist/` folder contains your production build. Host it on Vercel, Netlify, or any static file server. Update `.env` with your production backend/NodeRED URLs before building.

## Documentation

- [Getting Started](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/getting-started.md) — full setup tutorial
- [Architecture](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/architecture.md) — how the five layers connect
- [Add a Custom Visualization](../docs/guides/add-custom-visualization.md) — build sensor-specific UI components
- [Add a New Page](../docs/guides/add-new-page.md) — add routes and navigation
- [JavaScript Client API](../docs/javascript-api.md) — WebSocket client reference
