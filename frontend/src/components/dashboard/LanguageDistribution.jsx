/**
 * LanguageDistribution.jsx
 * Pie chart of interactions grouped by language.
 * Uses recharts PieChart.
 */
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Colour palette — distinct enough to differentiate 10+ languages
const PALETTE = [
  "#f97316", "#3b82f6", "#10b981", "#a855f7",
  "#ef4444", "#eab308", "#06b6d4", "#ec4899",
  "#84cc16", "#f59e0b", "#6366f1", "#14b8a6",
];

/**
 * @param {Object} props
 * @param {Array}  props.data  - [{ language: "Hindi", count: 120 }, ...]
 */
export default function LanguageDistribution({ data = [] }) {
  if (!data.length) {
    return (
      <div className="chart-empty">
        <span>No language data yet</span>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Language Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="language"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ language, count }) =>
              `${language} (${Math.round((count / total) * 100)}%)`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val, name) => [`${val} interactions`, name]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
