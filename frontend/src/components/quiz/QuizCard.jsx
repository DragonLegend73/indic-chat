/**
 * QuizCard.jsx
 * Renders a single multiple-choice question.
 * Locks options after selection and highlights correct/wrong answers.
 */

const OPTION_LETTERS = ["A", "B", "C", "D"];

/**
 * @param {Object}   props
 * @param {number}   props.index         - 1-based question number
 * @param {Object}   props.question      - { question, options, correct, explanation }
 * @param {string}   [props.selected]    - "A" | "B" | "C" | "D" | null
 * @param {boolean}  [props.revealed]    - show correct answer
 * @param {Function} props.onSelect      - (letter: string) => void
 */
export default function QuizCard({
  index,
  question,
  selected = null,
  revealed = false,
  onSelect,
}) {
  const isAnswered = selected !== null;

  const getOptionClass = (letter) => {
    let cls = "quiz-option";
    if (!isAnswered) return cls;
    if (letter === question.correct && revealed) cls += " quiz-option--correct";
    else if (letter === selected && selected !== question.correct && revealed)
      cls += " quiz-option--wrong";
    else if (letter === selected) cls += " quiz-option--selected";
    return cls;
  };

  return (
    <div className="quiz-card">
      <p className="quiz-card__question">
        <span className="quiz-card__number">Q{index}.</span> {question.question}
      </p>

      <div className="quiz-card__options">
        {OPTION_LETTERS.map((letter, i) => (
          <button
            key={letter}
            type="button"
            className={getOptionClass(letter)}
            onClick={() => !isAnswered && onSelect(letter)}
            disabled={isAnswered}
            aria-pressed={selected === letter}
          >
            <span className="option-letter">{letter}.</span>
            <span className="option-text">{question.options[i]}</span>
            {revealed && letter === question.correct && (
              <span className="option-tick">✓</span>
            )}
            {revealed && letter === selected && selected !== question.correct && (
              <span className="option-cross">✗</span>
            )}
          </button>
        ))}
      </div>

      {revealed && question.explanation && (
        <div className="quiz-card__explanation">
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
}
