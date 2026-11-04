/** Generic sensor visualization: shows raw value as a large number */
export default function GenericViz({ value, unit }) {
  const display =
    value === null || value === undefined
      ? '--'
      : typeof value === 'number'
        ? value.toFixed(1)
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

  return (
    <div className="flex items-baseline gap-1 justify-center">
      <span className="text-3xl font-bold tabular-nums">{display}</span>
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  );
}
