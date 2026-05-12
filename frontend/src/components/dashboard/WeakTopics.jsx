/**
 * WeakTopics.jsx
 * Ranked list of topics the student struggles with most.
 * Includes a "Practice" button that navigates to quiz mode.
 */
import { useNavigate } from "react-router-dom";

/**
 * @param {Object} props
 * @param {Array}  props.topics  - [{ name, mastery, accuracy, subject }, ...]
 */
export default function WeakTopics({ topics = [] }) {
  const navigate = useNavigate();

  if (!topics.length) {
    return (
      <div className="chart-empty">
        <span>No weak topics identified yet — keep studying!</span>
      </div>
    );
  }

  return (
    <div className="weak-topics">
      <h3 className="chart-title">Topics to Revise</h3>
      <ul className="weak-topics__list">
        {topics.slice(0, 8).map((t, i) => {
          const pct = Math.round((t.accuracy ?? 0) * 100);
          return (
            <li key={t.name} className="weak-topic-item">
              <div className="weak-topic-rank">#{i + 1}</div>

              <div className="weak-topic-info">
                <span className="weak-topic-name">{t.name}</span>
                {t.subject && (
                  <span className="weak-topic-subject">{t.subject}</span>
                )}
              </div>

              <div className="weak-topic-bar-wrap">
                <div
                  className="weak-topic-bar"
                  style={{ width: `${pct}%` }}
                  aria-label={`${pct}% accuracy`}
                />
                <span className="weak-topic-pct">{pct}%</span>
              </div>

              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={() =>
                  navigate("/quiz", { state: { topic: t.name } })
                }
              >
                Practice
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
