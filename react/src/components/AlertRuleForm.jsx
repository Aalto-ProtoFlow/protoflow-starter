import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
];

/**
 * AlertRuleForm — inline form for creating a new alert rule
 *
 * Props:
 *   sensorList — array of sensor name strings
 *   onSubmit(rule) — called with { sensor_name, operator, threshold }
 */
export default function AlertRuleForm({ sensorList, onSubmit }) {
  const [sensorName, setSensorName] = useState(sensorList[0] || '');
  const [operator, setOperator] = useState('gt');
  const [threshold, setThreshold] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!sensorName || threshold === '') return;
    onSubmit({
      sensor_name: sensorName,
      operator,
      threshold: Number(threshold),
    });
    setThreshold('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 pt-4 border-t">
      <div className="space-y-1">
        <Label>Sensor</Label>
        <select
          value={sensorName}
          onChange={(e) => setSensorName(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        >
          {sensorList.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Condition</Label>
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Threshold</Label>
        <Input
          type="number"
          step="any"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="50"
          required
          className="w-24"
        />
      </div>
      <Button type="submit" size="sm">Add Rule</Button>
    </form>
  );
}
