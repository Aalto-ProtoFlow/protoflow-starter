import { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import api from '../lib/api.js';
import AlertRuleForm from '../components/AlertRuleForm.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const OP_LABELS = { gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=' };

export default function SettingsPage() {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [sensorList, setSensorList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load device + alerts + sensor list
  useEffect(() => {
    api.get(`/devices/${deviceId}`).then((d) => {
      setDevice(d);
      setDeviceName(d.name);
    }).catch(console.error);

    api.get(`/devices/${deviceId}/alerts`).then(setAlerts).catch(console.error);

    api.get(`/measurements/${deviceId}/latest`).then((data) => {
      setSensorList(data.map((m) => m.sensor_name));
    }).catch(console.error);
  }, [deviceId]);

  async function handleSaveName(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/devices/${deviceId}`, { name: deviceName });
      setDevice((d) => ({ ...d, name: deviceName }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAlert(rule) {
    setError('');
    try {
      await api.post(`/devices/${deviceId}/alerts`, rule);
      const updated = await api.get(`/devices/${deviceId}/alerts`);
      setAlerts(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteAlert(alertId) {
    try {
      await api.delete(`/alerts/${alertId}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      setError(err.message);
    }
  }

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Device name */}
      <Card>
        <CardHeader>
          <CardTitle>Device Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Visibility toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Visibility</CardTitle>
          <CardDescription>
            Public devices allow anyone to view sensor data without logging in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              id="visibility"
              checked={device?.public || false}
              onCheckedChange={async (checked) => {
                try {
                  const updated = await api.patch(`/devices/${deviceId}`, { public: checked });
                  setDevice(updated);
                } catch (err) {
                  setError(err.message);
                }
              }}
            />
            <Label htmlFor="visibility">
              {device?.public ? 'Public' : 'Private'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Alert rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules</CardTitle>
          <CardDescription>
            Get notified when a sensor value crosses a threshold.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length > 0 ? (
            <ul className="space-y-2">
              {alerts.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">
                    <span className="font-medium">{rule.sensor_name}</span>{' '}
                    {OP_LABELS[rule.operator] || rule.operator} {rule.threshold}
                    {rule.enabled ? '' : ' (disabled)'}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteAlert(rule.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No alert rules yet.</p>
          )}

          {sensorList.length > 0 && (
            <AlertRuleForm sensorList={sensorList} onSubmit={handleAddAlert} />
          )}
        </CardContent>
      </Card>

      {/* Device info */}
      <Card>
        <CardHeader>
          <CardTitle>Device Info</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="text-sm w-full">
            <tbody>
              <tr><td className="text-muted-foreground pr-4 py-1">UUID</td><td className="font-mono">{device?.uuid}</td></tr>
              <tr><td className="text-muted-foreground pr-4 py-1">Type</td><td>{device?.type}</td></tr>
              <tr><td className="text-muted-foreground pr-4 py-1">Status</td><td>{device?.status}</td></tr>
              <tr><td className="text-muted-foreground pr-4 py-1">Created</td><td>{device?.created_at}</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
