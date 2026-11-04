import { Progress } from '@/components/ui/progress';

/** Slider / potentiometer visualization: progress bar + large number */
export default function SliderViz({ value, unit }) {
  const num = typeof value === 'number' ? value : 0;
  const pct = Math.min(100, Math.max(0, num));

  return (
    <>
      <div className="flex items-baseline gap-1 justify-center mb-3">
        <span className="text-3xl font-bold tabular-nums">{num.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">{unit || '%'}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </>
  );
}
