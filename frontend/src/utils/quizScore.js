/**
 * Utility for evaluating quiz answers and scaling difficulty.
 * 
 * @param {string} userAnswer - The answer provided by the student.
 * @param {string} correctAnswer - The correct answer to the question.
 * @param {string} currentDifficulty - Current level ('easy', 'medium', 'hard').
 * @returns {object} { is_correct, feedback, new_difficulty }
 */
export function evaluateAnswer(userAnswer, correctAnswer, currentDifficulty) {
  const normalizedUser = (userAnswer || "").trim().toLowerCase();
  const normalizedCorrect = (correctAnswer || "").trim().toLowerCase();

  const isCorrect = normalizedUser === normalizedCorrect;

  let feedback = "";
  if (isCorrect) {
    feedback = "Correct! Well done!";
  } else {
    feedback = `The correct answer is ${correctAnswer}.`;
  }

  // Difficulty scaling logic: easy -> medium -> hard on correct, stay same on incorrect.
  let newDifficulty = currentDifficulty;
  if (isCorrect) {
    if (currentDifficulty === "easy") newDifficulty = "medium";
    else if (currentDifficulty === "medium") newDifficulty = "hard";
  }

  return {
    is_correct: isCorrect,
    feedback: feedback,
    new_difficulty: newDifficulty,
  };
}
