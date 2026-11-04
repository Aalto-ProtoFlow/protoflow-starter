# ProtoFlow Starter

The web app for your team's ProtoFlow prototype. Start from plain HTML or from React, see live data from your devices on your team server, and publish the result on the web.

```
ESP32 with Grove sensors and actuators
        │  WiFi, WebSocket
        ▼
Your team server (YOUR-TEAM.proto.aalto.fi): Node-RED + backend
        │  WebSocket: live data and commands     HTTPS: login, history
        ▼
This web app, in the browser
```

The app is plain files that run in the browser, so it can be hosted anywhere. It talks only to your team server, never to the ESP32 directly.

## 1. Set your server

Replace `YOUR-TEAM` with your team server's name (for example `alpha`) everywhere in this repository. A project-wide find-and-replace does it in one go. It appears in two places:

- the `<meta name="protoflow-websocket-url">` line of each page in `html/`
- `react/.env`

## 2. Pick a starting point

**Plain HTML** (`html/`, no tools needed)

- Open `html/index.html` in a browser. It lists your devices, shows every sensor value as it arrives and gives each on/off actuator an On and Off button. Build your own page from it.
- `viewer-multi.html`, `controller.html` and `bidirectional.html` are bigger references, with a display for each kind of sensor and a control for each kind of actuator.

**React** (`react/`, needs Node.js 20 or newer)

```bash
cd react
npm install
npm run dev
```

Open http://localhost:5173 and register an account on the login page. The app has a device list where you claim your team's devices, a live dashboard, history charts and alert settings. See `react/README.md`.

## 3. Know your components

[docs/components.md](docs/components.md) lists every Grove component: the names and values your app receives, and the exact commands each actuator accepts. The connector library is described in [docs/javascript-api.md](docs/javascript-api.md).

## 4. Publish

Your app can live on any static host. Put this repository on GitHub, then:

- **Plain HTML: GitHub Pages.** In the repository's Settings > Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`. Your page appears at `https://<user>.github.io/<repository>/html/index.html`.
- **React: Vercel or Netlify.** Sign in with GitHub and import the repository. Set the root (base) directory to `react`; the build command is `npm run build` and the output folder is `dist`. Every push to `main` then publishes the app.

GitHub Pages is free for public repositories. Vercel and Netlify also publish private ones.

## Working with an AI assistant

[AGENTS.md](AGENTS.md) tells AI coding tools how this project works, and many read it automatically. If yours doesn't, point it at that file. In a chat-only AI, attach `AGENTS.md` and `docs/components.md`.
