# Team guide

How to get your ESP32s talking to your team server, and where to look when something doesn't work. For building the web app itself, see [README.md](README.md).

## What you have

```
ESP32 + Grove modules  ──WiFi──►  Team server YOUR-TEAM.proto.aalto.fi  ◄──  Your web app (this repository)
  (Arduino sketch)                  Node-RED: live data and commands
                                    Backend: accounts, devices, history
```

| What | Address |
|---|---|
| Node-RED editor | `https://YOUR-TEAM.proto.aalto.fi/nr/`, user `admin`, password from your teacher |
| Devices connect to | `wss://YOUR-TEAM.proto.aalto.fi/ws/device` |
| Web apps connect to | `wss://YOUR-TEAM.proto.aalto.fi/ws/app` |
| Backend API | `https://YOUR-TEAM.proto.aalto.fi/api` |

Is the server up? Open `https://YOUR-TEAM.proto.aalto.fi/api/health`. It shows `{"status":"ok"}`.

Work in this order: set up Arduino IDE (part 1), get one board online and see its data in Node-RED (part 2), then open a web page on the data (part 4). Get one module working before you add the next.

## 1. Set up Arduino IDE (once per computer)

1. Install **Arduino IDE 2** from [arduino.cc/en/software](https://www.arduino.cc/en/software).
2. **If your Documents folder syncs to OneDrive (it does on Aalto Macs), move the sketchbook out of it first.** Arduino libraries don't work well inside OneDrive. In **Arduino IDE > Settings** (Windows: **File > Preferences**), set **Sketchbook location** to a folder outside Documents, for example `Arduino` in your home folder. Restart Arduino IDE.
3. **ESP32 support**: **Tools > Board > Boards Manager**, search `esp32`, install **esp32 by Espressif Systems** (tested with version 3.3.12).
4. **Libraries**: **Tools > Manage Libraries**, install **ArduinoWebsockets** by Gil Maimon and **ArduinoJson** by Benoit Blanchon.
5. **ProtoFlow library**: download [ProtoFlow.zip](https://proto.aalto.fi/dist/ProtoFlow.zip) and don't unzip it. Choose **Sketch > Include Library > Add .ZIP Library…** and pick the file. The examples then appear under **File > Examples > ProtoFlow**.
6. **Some modules need one more library.** Install it as in step 4:

| Module (component) | Library to install |
|---|---|
| 3-Axis Digital Accelerometer (`GroveAccelerometer`) | Accelerometer ADXL345 (Seeed Studio) |
| Gesture Sensor (`GroveGesture`) | Gesture PAJ7620 (Seeed Studio) |
| LCD RGB Backlight (`GroveLCDRGB`) | Grove - LCD RGB Backlight |
| 4-Digit Display (`Grove4DigitDisplay`) | Grove 4-Digit Display |
| Chainable RGB LED (`GroveChainableRGB`) | Grove - Chainable RGB LED |
| RGB LED Stick (`GroveRGBLEDStick`) | Adafruit NeoPixel |
| OLED Display (`GroveOLED`) | U8g2 |
| MP3 player (`GroveMP3`) | Seeed Serial MP3 Player and EspSoftwareSerial |
| Ultrasonic Ranger (`GroveUltrasonic`) | Grove Ultrasonic Ranger |

The other modules need nothing extra. If an example's comments name a different library, trust this table ([docs/components.md](docs/components.md) lists the same under each module).

## 2. Get a board online

Start from the example sketch for your module, as below. Or start from [firmware/TeamDevice/](firmware/TeamDevice/) in this repository: it already connects and has one LED on pin 33, and you add modules as [docs/components.md](docs/components.md) shows under "In a sketch". That file lists every module, its example, and the names its data arrives under.

1. **Open the example**: **File > Examples > ProtoFlow**, for example **Sensors > GroveTempHumidity**.
2. **Save your own copy**: **File > Save As**, into a `firmware/` folder in this repository, so the sketch lives with the rest of your project.
3. **Create `config.h`**: the sketch has a `config.example.h` tab. Click **⋯** at the right end of the tab bar, choose **New Tab** and name it `config.h`. Copy everything from `config.example.h` into it, then set:
   ```cpp
   const char* WIFI_SSID     = "your network";
   const char* WIFI_PASSWORD = "its password";
   const char* WEBSOCKET_URL = "wss://YOUR-TEAM.proto.aalto.fi/ws/device";
   ```
   Leave the certificate below them as it is. `config.h` holds your WiFi password, so this repository's `.gitignore` keeps it out of git.

   **WiFi**: the ESP32 joins only 2.4 GHz networks with a plain password. Networks that ask for a username, such as `aalto`, don't work. Ask your teacher which network to use. A phone hotspot works too (on an iPhone, turn on **Maximize Compatibility**).
4. **Wire the module** to the pin the sketch uses. The comment at the top says which: the temperature sensor example uses pin 32, the LED example pin 33, and I²C modules such as the accelerometer use SDA 21 and SCL 22. To use another pin, change the number in the sketch. Grove cable colours: yellow is the signal (SCL on I²C modules), white the second signal (SDA), red power, black ground.
5. **Upload**: plug in the board, choose **Tools > Board > esp32 > ESP32 Dev Module** and the board's port in **Tools > Port**, then click **Upload** (→).
6. **Watch it start**: **Tools > Serial Monitor**, set to **115200 baud**. Look for these lines, in this order: `WiFi connected`, `WebSocket connected`, `Registration ACCEPTED`. The `device UUID` line identifies the board. It stays the same when you reflash.
7. **See the data**: in the Node-RED editor, open the debug sidebar (the bug icon, top right). Each message from your board appears under **Device RAW**. Or open `html/viewer-multi.html` from this repository in a browser.

**Several modules on one board**: keep your sketch and copy the other module's lines into it. The top comment of each example has a box, "HOW TO ADD … TO YOUR PROJECT", listing exactly the lines to copy. Each module needs its own pin. Two limits: two actuators of the same type on one board don't work (a command reaches only the first; see [docs/components.md](docs/components.md)), and a board can have only one accelerometer.

**Choosing pins**: a Grove cable that ends in jumper wires fits any pin. Any free GPIO works, within these limits:

| GPIO | |
|---|---|
| 32–39 | The only pins for analog modules (slider, rotary angle, thumb joystick, sound): the other analog pins stop working while WiFi is on |
| 34–39 | Input only: no LEDs, buzzers or other actuators |
| 21, 22 | I²C: SDA and SCL, shared by all I²C modules |
| 18, 19, 23 | SPI: SCK, MISO and MOSI, if you use an SPI module such as an e-paper display |
| 6–11 | Never: the board's flash memory. The board crashes |
| 0, 1, 2, 3, 12, 15 | Avoid: 1 and 3 are the USB serial port, and the others decide how the board starts |

Write down which pin each module is on in `TEAM-NOTES.md` (see the end of this guide).

**One board controlling another**, such as a button on one and a buzzer on the other: the sketch of the first sends `ProtoFlow.sendCommand("Other board", "buzzer", true)`, see [docs/guides/add-custom-actuator.md](docs/guides/add-custom-actuator.md#a-command-from-another-board). Give every board its own `DEVICE_NAME`.

**A module that isn't in [docs/components.md](docs/components.md)**, such as a servo or an e-paper display: follow [docs/guides/add-custom-sensor.md](docs/guides/add-custom-sensor.md) for something the board reads, or [docs/guides/add-custom-actuator.md](docs/guides/add-custom-actuator.md) for something it drives.

**Untested modules**: [docs/components.md](docs/components.md) says which modules have been checked on hardware. If one of the others behaves oddly, show your TA what the Serial Monitor says.

## 3. The Node-RED editor

`https://YOUR-TEAM.proto.aalto.fi/nr/`, user `admin`, password from your teacher. Node-RED passes every message between your boards and your web apps, and forwards the readings to the backend, which stores them for history.

- **Watch the traffic** in the debug sidebar: **Device RAW** shows what boards send, **PWA RAW** what web apps send.
- **You may change the flows**, but a server rebuild resets them. After each change, choose **Menu > Export**, **all flows**, **Download**, and save the file in this repository, for example as `server/flows.json`. To restore it: **Menu > Import**, then **Deploy**.
- Leave the **POST to Backend Webhook** node in place. Without it nothing is stored, and history stays empty.
- Never put the editor password in this repository.

## 4. The web app

Follow [README.md](README.md): set your server's name, pick plain HTML or React, publish.

- The plain HTML pages show every device on your server. They need no account.
- The React app needs an account on your server: register on its login page. The **Devices** page lists, under **Available Devices**, boards that have connected but have no owner yet. Claim yours there. They then appear on the dashboard and in history.

## 5. Server shell access (only if your teacher gave you SSH access)

```bash
ssh proto@YOUR-TEAM.proto.aalto.fi
```

SSH may work only from the Aalto network: on campus, or over the Aalto VPN.

| What | Where |
|---|---|
| Node-RED | service `node-red`; flows in `/home/proto/.node-red/flows.json` |
| Backend | service `protoflow-backend`; code in `/home/proto/backend`; database `/home/proto/backend/data/protoflow.db` |
| Editor password | `/home/proto/nodered-password.txt` |

```bash
sudo systemctl restart node-red           # restart Node-RED (or protoflow-backend)
sudo journalctl -u node-red -f            # Node-RED's log, live (Ctrl+C stops)
sudo journalctl -u protoflow-backend -f   # the backend's log
```

If the server breaks, your teacher can rebuild it. A rebuild erases everything on it: flows, accounts, devices and stored readings, and the editor gets a new password. Keep everything you care about in this repository.

## When something doesn't work

| What you see | Check |
|---|---|
| Compile error `…: No such file or directory` | A library is missing: part 1, steps 4–6 |
| `Multiple libraries were found for "ProtoFlow.h"` | An old copy is installed. Keep only `libraries/ProtoFlow` in your sketchbook folder |
| No port in **Tools > Port** | Try another USB cable: many cables only charge |
| Serial Monitor shows garbage | Set it to 115200 baud |
| WiFi never connects | A 2.4 GHz network with a plain password; network name and password typed exactly (case matters) |
| WiFi connects, WebSocket doesn't | `WEBSOCKET_URL` ends in `/ws/device` and has your server's name; the server is up (`/api/health`) |
| `Sensor test FAILED`, `not detected` or `Read failed` | The wiring, and the pin number in the sketch |
| Board online, web page shows nothing | The page still says `YOUR-TEAM`, or the sensor hasn't sent yet: some send only when the value changes |
| Still stuck | Ask your TA, and bring the Serial Monitor output |

**AI tools** that work in this repository (Codex, Claude Code, Cursor, Copilot) read [AGENTS.md](AGENTS.md), which covers the web app and the sketches in `firmware/`. Tell them which pin each module is wired to. A chat tool that can't see the repository (ChatGPT, Gemini or Claude in the browser) knows nothing about ProtoFlow: attach [AI-CONTEXT.md](AI-CONTEXT.md) at the start of the conversation, then paste the sketch or page you want changed.

**`TEAM-NOTES.md`**: keep what is true only for your team in this file at the root of the repository: which pin each module is on, modules without a component, extra libraries, decisions you have made. AI tools that work in the repository read it, and add to it when you tell them such facts; attach it to a chat tool together with `AI-CONTEXT.md`. Don't put your notes in `AGENTS.md`, `TEAM-GUIDE.md` or `docs/`: those files change when the starter is updated.
