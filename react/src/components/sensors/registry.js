/**
 * Sensor visualization registry
 *
 * Maps sensor names/types to visualization components.
 * To add a custom sensor visualization:
 *   1. Create a new component (e.g., MyViz.jsx)
 *   2. Add an entry to PATTERNS below
 *
 * Each entry: { match: /regex/, component: YourComponent }
 * The regex is tested against "sensorName sensorType" (lowercase).
 */

import SliderViz from './SliderViz.jsx';
import GenericViz from './GenericViz.jsx';

const PATTERNS = [
  { match: /slider|potentiometer|rotary/, component: SliderViz },
  // Add your custom sensor visualizations here:
  // { match: /flex/, component: FlexViz },
  // { match: /temperature|temp/, component: TemperatureViz },
];

/** Auto-detect sensor visualization component from sensor name/type */
export function getSensorComponent(sensorName, sensorType) {
  const key = `${sensorName} ${sensorType || ''}`.toLowerCase();
  for (const { match, component } of PATTERNS) {
    if (match.test(key)) return component;
  }
  return GenericViz;
}
