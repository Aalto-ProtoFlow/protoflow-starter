# Add a Custom Sensor

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
