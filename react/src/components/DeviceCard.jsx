import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DeviceCard({ device }) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/dashboard/${device.id}`)}
    >
      <CardHeader>
        <CardTitle>{device.name || 'Unnamed Device'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground font-mono truncate">{device.uuid}</p>
        <Badge variant="secondary">{device.type || 'ESP32'}</Badge>
      </CardContent>
    </Card>
  );
}
