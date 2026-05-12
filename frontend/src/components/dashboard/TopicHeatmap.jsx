/**
 * TopicHeatmap.jsx
 * Grid of topic mastery cells — colour-coded by mastery level (0–5).
 * No external chart library needed; pure CSS grid.
 */

const LEVEL_COLORS = [
  "#e5e7eb", // 0 — not attempted
  "#fca5a5", // 1 — very weak
  "#fcd34d", // 2 — weak
  "#86efac", // 3 — moderate
  "#4ade80", // 4 — good
  "#16a34a", // 5 — mastered
];

const LEVEL_LABELS = ["Not started", "Very weak", "Weak", "Moderate", "Good", "Mastered"];

/**
 * @param {Object} props
 * @param {Array}  props.topics  - [{ name: string, mastery: 0–5, attempts: number }]
 */
export default function TopicHeatmap({ topics = [] }) {
  if (!topics.length) {
    return (
      <div className="chart-empty">
        <span>No topics studied yet</span>
      </div>
    );
  }

  return (
    <div className="heatmap-wrapper">
      <h3 className="chart-title">Topic Mastery</h3>

      <div className="heatmap-grid">
        {topics.map((t) => {
          const level = Math.max(0, Math.min(5, Math.round(t.mastery ?? 0)));
          return (
            <div
              key={t.name}
              className="heatmap-cell"
              style={{ background: LEVEL_COLORS[level] }}
              title={`${t.name}: ${LEVEL_LABELS[level]} (${t.attempts ?? 0} attempts)`}
            >
              <span className="heatmap-cell__name">{t.name}</span>
              <span className="heatmap-cell__level">{LEVEL_LABELS[level]}</span>
            </div>
          );
        })}
      </div>

      <div className="heatmap-legend">
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} className="legend-item">
            <span className="legend-swatch" style={{ background: color }} />
            <span className="legend-label">{LEVEL_LABELS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
