import { useState, useEffect, useCallback } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import api from '../lib/api.js';
import SensorChart from '../components/SensorChart.jsx';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [sensor, setSensor] = useState('');
  const [sensorList, setSensorList] = useState([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load device info
  useEffect(() => {
    api.get(`/devices/${deviceId}`).then(setDevice).catch(console.error);
  }, [deviceId]);

  // Load latest readings to discover which sensors exist
  useEffect(() => {
    api.get(`/measurements/${deviceId}/latest`)
      .then((data) => {
        const names = data.map((m) => m.sensor_name);
        setSensorList(names);
        if (names.length > 0 && !sensor) {
          setSensor(names[0]);
        }
      })
      .catch(console.error);
  }, [deviceId]);

  // Function to fetch measurements
  const fetchMeasurements = useCallback(() => {
    if (!sensor) return;
    const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    api.get(`/measurements/${deviceId}?sensor=${sensor}&from=${from}&limit=500`)
      .then((data) => setMeasurements(data))
      .catch(console.error);
  }, [deviceId, sensor, hours]);

  // Load measurements when sensor or time range changes
  useEffect(() => {
    if (!sensor) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchMeasurements();
    setLoading(false);
  }, [deviceId, sensor, hours, fetchMeasurements]);

  // Auto-refresh every 200ms when enabled
  useEffect(() => {
    if (!autoRefresh || !sensor) return;
    const interval = setInterval(fetchMeasurements, 200);
    return () => clearInterval(interval);
  }, [autoRefresh, sensor, fetchMeasurements]);

  const tabClass = ({ isActive }) =>
    cn(
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-secondary text-secondary-foreground'
        : 'text-muted-foreground hover:text-foreground'
    );

  const selectClass = "flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{device?.name || 'Loading...'}</h1>

      <div className="flex gap-1">
        <NavLink to={`/dashboard/${deviceId}`} className={tabClass}>Live</NavLink>
        <NavLink to={`/history/${deviceId}`} className={tabClass}>History</NavLink>
        <NavLink to={`/settings/${deviceId}`} className={tabClass}>Settings</NavLink>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={sensor} onChange={(e) => setSensor(e.target.value)} className={selectClass}>
          {sensorList.length === 0 && <option value="">No sensors found</option>}
          {sensorList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={selectClass}>
          <option value={1}>Last 1 hour</option>
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
          <option value={168}>Last 7 days</option>
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <Label htmlFor="auto-refresh">Auto-refresh</Label>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading measurements...</p>
      ) : measurements.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <h3 className="text-lg font-medium">No measurements yet</h3>
          <p className="text-muted-foreground">Send sensor data through NodeRED and it will appear here.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <SensorChart measurements={measurements} sensorName={sensor} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
