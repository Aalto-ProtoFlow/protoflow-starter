# Add a Custom Visualization

## What you'll build

You will create a polished React visualization component for a temperature sensor that uses Tailwind CSS for color-coding, a shadcn/ui Progress bar as a gauge, and a Badge to display the status label. You will register it in the sensor registry so the dashboard automatically uses it for any sensor matching "temperature" or "temp".

## Prerequisites

- The starter app running locally (`npm run dev` in `react/`)
- A device sending temperature data (real or simulated -- see [Add a Custom Sensor](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-custom-sensor.md))
- Basic familiarity with React and Tailwind CSS

## Steps

### 1. Create the visualization component

Create `react/src/components/sensors/TemperatureViz.jsx`:

```jsx
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

function getTempInfo(temp) {
  if (temp < 0)  return { color: 'text-blue-600',   bg: 'bg-blue-500',   label: 'Freezing' };
  if (temp < 10) return { color: 'text-blue-500',   bg: 'bg-blue-400',   label: 'Cold' };
  if (temp < 18) return { color: 'text-cyan-500',   bg: 'bg-cyan-400',   label: 'Cool' };
  if (temp < 24) return { color: 'text-green-500',  bg: 'bg-green-400',  label: 'Comfortable' };
  if (temp < 30) return { color: 'text-yellow-500', bg: 'bg-yellow-400', label: 'Warm' };
  if (temp < 35) return { color: 'text-orange-500', bg: 'bg-orange-400', label: 'Hot' };
  return               { color: 'text-red-500',    bg: 'bg-red-500',    label: 'Extreme' };
}

export default function TemperatureViz({ value, unit }) {
  const temp = typeof value === 'number' ? value : 0;
  const display = typeof value === 'number' ? value.toFixed(1) : '--';
  const { color, bg, label } = getTempInfo(temp);

  // Map temperature range (-10 to 50) onto 0-100 for the progress bar
  const pct = Math.min(100, Math.max(0, ((temp + 10) / 60) * 100));

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Large temperature number */}
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold tabular-nums ${color}`}>
          {display}
        </span>
        <span className="text-sm text-muted-foreground">{unit || '\u00B0C'}</span>
      </div>

      {/* Gauge bar — use inline style for dynamic color since Tailwind
          cannot generate classes from runtime values */}
      <div className="w-full">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${bg}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Status badge */}
      <Badge variant="secondary">{label}</Badge>
    </div>
  );
}
```

Notes on the implementation:
- **Tailwind dynamic classes**: Tailwind only includes classes it finds in your source files at build time. The color classes in `getTempInfo()` work because they are complete string literals (e.g., `'text-blue-500'`). Never build class names dynamically like `` `text-${color}-500` `` -- those will not be included in the CSS bundle.
- **Inline `style` for the progress width**: The percentage is a runtime value, so we use `style={{ width: ... }}` rather than a Tailwind class.
- **shadcn/ui imports**: The `@/` prefix maps to `src/` via the alias configured in `vite.config.js` and `jsconfig.json`.

### 2. Register in the sensor registry

Edit `react/src/components/sensors/registry.js`:

```javascript
import SliderViz from './SliderViz.jsx';
import GenericViz from './GenericViz.jsx';
import TemperatureViz from './TemperatureViz.jsx';

const PATTERNS = [
  { match: /slider|potentiometer|rotary/, component: SliderViz },
  { match: /temperature|temp/, component: TemperatureViz },
  // Add more custom visualizations here
];

/** Auto-detect sensor visualization component from sensor name/type */
export function getSensorComponent(sensorName, sensorType) {
  const key = `${sensorName} ${sensorType || ''}`.toLowerCase();
  for (const { match, component } of PATTERNS) {
    if (match.test(key)) return component;
  }
  return GenericViz;
}
```

### 3. Understand the matching logic

The `getSensorComponent()` function is called by `SensorDisplay` for every sensor card on the dashboard:

```jsx
// From SensorDisplay.jsx — this is already in the starter app
import { getSensorComponent } from './sensors/registry.js';

export default function SensorDisplay({ sensorName, value, unit }) {
  const Component = getSensorComponent(sensorName);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {sensorName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Component value={value} unit={unit} />
      </CardContent>
    </Card>
  );
}
```

The matching flow:
1. `getSensorComponent("temperature")` builds key `"temperature "`
2. Tests against `PATTERNS` in order: `/slider|potentiometer|rotary/` does not match, `/temperature|temp/` matches
3. Returns `TemperatureViz`
4. If nothing matched, would return `GenericViz`

This means a sensor named `"temp_outdoor"` would also match because the key `"temp_outdoor "` contains `"temp"`.

### 4. Add more shadcn/ui components (optional)

You can use any shadcn/ui component in your visualization. For example, adding a small sparkline description under the badge:

```jsx
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// You can also use the standard Progress component directly:
<Progress value={pct} className="h-2" />
```

The starter app ships with these shadcn/ui components ready to use: `Button`, `Card`, `Input`, `Label`, `Switch`, `Badge`, `Progress`.

## Verify it works

1. Make sure your device (or simulator) is sending data with sensor name `"temperature"` or `"temp"`
2. Open the dashboard page for that device
3. Instead of a plain number, you should see:
   - A large colored temperature value
   - A horizontal gauge bar that fills based on the temperature range
   - A badge showing "Cold", "Comfortable", "Warm", etc.
4. Change the temperature and watch the colors, gauge, and label update in real time

## Next steps

- [Add a Custom Sensor](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/add-custom-sensor.md) — wire a real sensor and send data from firmware
- [Add a New Page](./add-new-page.md) — create a dedicated page for your custom feature
- [Integrate an External API](https://github.com/Aalto-ProtoFlow/protoflow/blob/main/docs/guides/integrate-external-api.md) — combine sensor data with external data sources
