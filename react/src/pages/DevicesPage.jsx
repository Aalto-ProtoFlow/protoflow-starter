import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import DeviceCard from '../components/DeviceCard.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [unclaimedDevices, setUnclaimedDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Claim form state
  const [uuid, setUuid] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [claiming, setClaiming] = useState(false);

  async function loadDevices() {
    try {
      const data = await api.get('/devices');
      setDevices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnclaimed() {
    try {
      const data = await api.get('/devices/unclaimed');
      setUnclaimedDevices(data);
    } catch (err) {
      // Non-critical — silently ignore
    }
  }

  useEffect(() => {
    loadDevices();
    loadUnclaimed();
  }, []);

  async function handleClaim(e) {
    e.preventDefault();
    if (!uuid.trim()) return;
    setClaiming(true);
    setError('');

    try {
      await api.post('/devices', { uuid: uuid.trim(), name: deviceName.trim() || undefined });
      setUuid('');
      setDeviceName('');
      loadDevices();
      loadUnclaimed();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  async function handleClaimUnclaimed(deviceUuid, name) {
    setClaiming(true);
    setError('');

    try {
      await api.post('/devices', { uuid: deviceUuid, name: name || undefined });
      loadDevices();
      loadUnclaimed();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  function formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Never';
    const diff = Date.now() - new Date(lastSeen).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Devices</h1>

      {/* Available (unclaimed) devices */}
      {unclaimedDevices.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-medium text-muted-foreground">Available Devices</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {unclaimedDevices.map((device) => (
              <Card key={device.id} className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">{device.name}</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    {device.uuid.substring(0, 18)}...
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{device.type}</Badge>
                    {device.capabilities && (
                      <span className="text-xs text-muted-foreground">
                        {(device.capabilities.sensors || []).length} sensor{(device.capabilities.sensors || []).length !== 1 ? 's' : ''}
                        {(device.capabilities.actuators || []).length > 0 &&
                          `, ${(device.capabilities.actuators || []).length} actuator${(device.capabilities.actuators || []).length !== 1 ? 's' : ''}`
                        }
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Seen {formatLastSeen(device.last_seen)}
                    </span>
                    <Button
                      size="sm"
                      disabled={claiming}
                      onClick={() => handleClaimUnclaimed(device.uuid, device.name)}
                    >
                      Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Claim a device by UUID */}
      <Card>
        <CardHeader>
          <CardTitle>Claim a Device</CardTitle>
          <CardDescription>
            Enter the UUID shown on your ESP32 Serial Monitor, or claim an available device above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleClaim} className="flex flex-wrap items-end gap-3">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="uuid">Device UUID</Label>
              <Input
                id="uuid"
                type="text"
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder="C10B65F4-413F-..."
                required
              />
            </div>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="device-name">Name (optional)</Label>
              <Input
                id="device-name"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="My Temperature Sensor"
              />
            </div>
            <Button type="submit" disabled={claiming}>
              {claiming ? 'Claiming...' : 'Claim'}
            </Button>
          </form>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Device list */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading devices...</p>
      ) : devices.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <h3 className="text-lg font-medium">No devices yet</h3>
          <p className="text-muted-foreground">Claim a device by entering its UUID above, or claim an available device from the list.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
