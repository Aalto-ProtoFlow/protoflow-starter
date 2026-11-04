import { useState, useEffect, useRef } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import useProtoFlow from '../hooks/useProtoFlow.js';
import api from '../lib/api.js';
import SensorDisplay from '../components/SensorDisplay.jsx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { deviceId } = useParams();
  const { status, devices, sensorData, connect, disconnect, subscribe } = useProtoFlow();

  const [device, setDevice] = useState(null);
  // Accumulate latest values per sensor: { sensorName: { value, timestamp } }
  const [sensorValues, setSensorValues] = useState({});
  const connectedRef = useRef(false);

  // Load device info from backend
  useEffect(() => {
    api.get(`/devices/${deviceId}`).then(setDevice).catch(console.error);
  }, [deviceId]);

  // Connect WebSocket on mount
  useEffect(() => {
    if (!connectedRef.current) {
      connect();
      connectedRef.current = true;
    }
    return () => {
      disconnect();
      connectedRef.current = false;
    };
  }, []);

  // Subscribe to device once we know its UUID and WS is connected
  useEffect(() => {
    if (status === 'connected' && device?.uuid) {
      subscribe(device.uuid);
    }
  }, [status, device?.uuid, subscribe]);

  // Accumulate sensor readings
  useEffect(() => {
    if (!sensorData) return;
    if (device && sensorData.device === device.uuid) {
      setSensorValues((prev) => ({
        ...prev,
        [sensorData.sensor]: {
          value: sensorData.value,
          timestamp: sensorData.timestamp,
        },
      }));
    }
  }, [sensorData, device]);

  const sensorNames = Object.keys(sensorValues);

  const tabClass = ({ isActive }) =>
    cn(
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-secondary text-secondary-foreground'
        : 'text-muted-foreground hover:text-foreground'
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{device?.name || 'Loading...'}</h1>

      <div className="flex gap-1">
        <NavLink to={`/dashboard/${deviceId}`} className={tabClass}>Live</NavLink>
        <NavLink to={`/history/${deviceId}`} className={tabClass}>History</NavLink>
        <NavLink to={`/settings/${deviceId}`} className={tabClass}>Settings</NavLink>
      </div>

      {/* WebSocket status */}
      <div className="flex items-center gap-2 text-sm">
        <span className={cn(
          'size-2 rounded-full',
          status === 'connected' ? 'bg-green-500' :
          status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          'bg-muted-foreground'
        )} />
        <span className="text-muted-foreground">WebSocket: {status}</span>
        {status === 'disconnected' && (
          <Button variant="outline" size="sm" onClick={connect}>Reconnect</Button>
        )}
      </div>

      {/* Sensor grid */}
      {sensorNames.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <h3 className="text-lg font-medium">Waiting for sensor data...</h3>
          <p className="text-muted-foreground">Make sure your ESP32 is connected and sending data through NodeRED.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {sensorNames.map((name) => (
            <SensorDisplay
              key={name}
              sensorName={name}
              value={sensorValues[name].value}
            />
          ))}
        </div>
      )}
    </div>
  );
}
