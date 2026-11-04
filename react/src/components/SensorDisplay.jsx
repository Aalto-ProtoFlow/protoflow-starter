import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getSensorComponent } from './sensors/registry.js';

/**
 * SensorDisplay — renders the right visualization for a sensor
 *
 * Uses the sensor registry to auto-detect which component to use
 * based on the sensor name. Falls back to GenericViz for unknown sensors.
 */
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
