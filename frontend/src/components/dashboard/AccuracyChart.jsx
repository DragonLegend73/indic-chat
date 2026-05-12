/**
 * AccuracyChart.jsx
 * Line chart of quiz accuracy over time per topic.
 * Uses recharts (already a common Vite+React choice; add to package.json).
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * @param {Object} props
 * @param {Array}  props.data  - [{ date: "Apr 1", accuracy: 72, attempts: 5 }, ...]
 */
export default function AccuracyChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="chart-empty">
        <span>No quiz data yet</span>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Quiz Accuracy Over Time</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            unit="%"
          />
          <Tooltip
            formatter={(val) => [`${val}%`, "Accuracy"]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Accuracy %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
