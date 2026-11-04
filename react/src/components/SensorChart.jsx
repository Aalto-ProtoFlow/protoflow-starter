import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Default ranges for common sensor types (based on typical registration values)
const SENSOR_RANGES = {
  slider: { min: 0, max: 100 },
  flex: { min: 0, max: 100 },
  potentiometer: { min: 0, max: 100 },
  humidity: { min: 0, max: 100 },
  temperature: { min: -40, max: 85 },
  light: { min: 0, max: 4095 },
  analog: { min: 0, max: 4095 },
};

function getSensorRange(sensorName) {
  const lowerName = sensorName.toLowerCase();
  for (const [key, range] of Object.entries(SENSOR_RANGES)) {
    if (lowerName.includes(key)) return range;
  }
  return null; // Auto-scale if unknown
}

/**
 * SensorChart — Line chart for historical sensor data
 *
 * Props:
 *   measurements — array of { value, measured_at } from the backend API
 *   sensorName   — displayed in chart title
 *   min, max     — optional fixed Y-axis range (overrides auto-detection)
 */
export default function SensorChart({ measurements, sensorName, min, max }) {
  if (!measurements || measurements.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No data to display</p>
      </div>
    );
  }

  // Reverse so oldest is on the left, newest on the right
  const sorted = [...measurements].reverse();

  const labels = sorted.map((m) =>
    new Date(m.measured_at).toLocaleTimeString()
  );
  const values = sorted.map((m) => m.value);

  const data = {
    labels,
    datasets: [
      {
        label: sensorName,
        data: values,
        borderColor: 'oklch(0.646 0.222 41.116)',
        backgroundColor: 'oklch(0.646 0.222 41.116 / 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: measurements.length > 100 ? 0 : 3,
      },
    ],
  };

  // Determine Y-axis range: explicit props > sensor type defaults > auto-scale
  const range = (min !== undefined && max !== undefined)
    ? { min, max }
    : getSensorRange(sensorName);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: sensorName,
        font: { size: 14 },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 10,
          font: { size: 11 },
        },
      },
      y: {
        min: range?.min,
        max: range?.max,
        ticks: {
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Line data={data} options={options} />
    </div>
  );
}
