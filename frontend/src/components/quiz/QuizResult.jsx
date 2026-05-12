/**
 * QuizResult.jsx
 * Post-quiz summary: score, per-question breakdown, adaptive feedback.
 */
import { useNavigate } from "react-router-dom";

/**
 * @param {Object} props
 * @param {number}  props.score        - 0–100
 * @param {number}  props.correct      - count correct
 * @param {number}  props.total        - total questions
 * @param {Array}   props.questions    - original question objects
 * @param {Object}  props.answers      - { [index]: "A"|"B"|"C"|"D" }
 * @param {string}  [props.feedback]   - AI-generated personalised feedback
 * @param {Function} props.onRetry     - restart quiz on same topic
 */
export default function QuizResult({
  score,
  correct,
  total,
  questions,
  answers,
  feedback,
  onRetry,
}) {
  const navigate = useNavigate();

  const emoji =
    score >= 80 ? "🏆" : score >= 60 ? "👍" : score >= 40 ? "📚" : "💪";

  return (
    <div className="quiz-result">
      <div className="quiz-result__header">
        <span className="result-emoji">{emoji}</span>
        <h2 className="result-score">{score}%</h2>
        <p className="result-summary">
          You got <strong>{correct}</strong> out of <strong>{total}</strong> correct.
        </p>
      </div>

      {feedback && (
        <div className="result-feedback">
          <h3>Feedback</h3>
          <p>{feedback}</p>
        </div>
      )}

      <div className="result-breakdown">
        <h3>Question Breakdown</h3>
        {questions.map((q, i) => {
          const userAns = answers[i];
          const isCorrect = userAns === q.correct;
          return (
            <div
              key={i}
              className={`breakdown-item ${isCorrect ? "correct" : "wrong"}`}
            >
              <div className="breakdown-indicator">{isCorrect ? "✓" : "✗"}</div>
              <div className="breakdown-body">
                <p className="breakdown-question">
                  Q{i + 1}. {q.question}
                </p>
                {!isCorrect && (
                  <p className="breakdown-answer">
                    Your answer: <strong>{userAns}</strong> · Correct:{" "}
                    <strong>{q.correct}</strong>
                  </p>
                )}
                {q.explanation && (
                  <p className="breakdown-explanation">{q.explanation}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="result-actions">
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Try Again
        </button>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => navigate("/chat")}
        >
          Back to Chat
        </button>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => navigate("/dashboard")}
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}
