/**
 * QuizPage.jsx
 * Full quiz flow: topic input → question card → answer evaluation.
 * Uses backend endpoints: /api/quiz/generate and /api/quiz/evaluate.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudent } from "../context/StudentContext";
import { generateQuiz, evaluateQuiz } from "../api/client";
import { evaluateAnswer } from "../utils/quizScore";
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

export default function QuizPage() {
  const navigate = useNavigate();
  const { student } = useStudent();

  // Phase: "setup" | "quiz" | "result"
  const [phase, setPhase] = useState("setup");

  // Setup form state
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("math");

  // Quiz state
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Result state
  const [result, setResult] = useState(null);
  const [questionsCompleted, setQuestionsCompleted] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const cardStyle = { background: '#2f2f2f' };
  const cardCls = "rounded-xl border border-white/[0.08] p-6";
  const inputCls = "w-full rounded-xl px-4 py-3 text-[#ececec] placeholder:text-[#8e8ea0] focus:outline-none transition-colors border border-white/[0.08] focus:border-white/25";
  const inputStyle = { background: '#3a3a3a' };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#212121' }}>
        <div className={`${cardCls} text-center`} style={cardStyle}>
          <p className="text-[#ececec] text-base mb-4">Please select a student first</p>
          <button onClick={() => navigate("/")} className="bg-white hover:bg-gray-100 text-[#212121] rounded-xl px-5 py-3 font-semibold text-sm">
            Go to Student Select
          </button>
        </div>
      </div>
    );
  }

  // ── Generate a question ────────────────────────────────────────
  const fetchQuestion = async () => {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setResult(null);
    try {
      const data = await generateQuiz(student.id, topic, subject);
      setQuestion(data);
      setPhase("quiz");
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message ?? "Failed to generate question");
    } finally {
      setLoading(false);
    }
  };

  // ── Evaluate the answer ────────────────────────────────────────
  const submitAnswer = async () => {
    if (!selectedAnswer || !question) return;
    setLoading(true);
    try {
      const evalResult = await evaluateQuiz({
        student_id: student.id,
        question: question.question,
        student_answer: selectedAnswer,
        correct_answer: question.correct_answer,
        topic: topic,
      });
      setResult(evalResult);
      setQuestionsCompleted(prev => prev + 1);
      if (evalResult.is_correct) setCorrectCount(prev => prev + 1);
      setPhase("result");
    } catch (e) {
      // Fallback: client-side evaluation using utility
      const { is_correct, feedback, new_difficulty } = evaluateAnswer(
        selectedAnswer,
        question.correct_answer,
        student.current_difficulty
      );
      setResult({ is_correct, feedback, new_difficulty });
      setQuestionsCompleted(prev => prev + 1);
      if (is_correct) setCorrectCount(prev => prev + 1);
      setPhase("result");
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setResult(null);
    setQuestion(null);
    fetchQuestion();
  };

  const resetQuiz = () => {
    setPhase("setup");
    setQuestion(null);
    setSelectedAnswer(null);
    setResult(null);
    setQuestionsCompleted(0);
    setCorrectCount(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#212121' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Quiz Mode</h1>
            <p className="text-[#8e8ea0] text-sm mt-1">
              {student.name} • {student.current_difficulty}
              {questionsCompleted > 0 && ` • ${correctCount}/${questionsCompleted} correct`}
            </p>
          </div>
          <button onClick={() => navigate("/chat")} className="text-sm text-[#8e8ea0] hover:text-[#ececec] transition-colors">
            ← Back to Chat
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── SETUP ──────────────────────────────────────────── */}
        {phase === "setup" && (
          <div className={`${cardCls} space-y-5`} style={cardStyle}>
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Start a Quiz</h2>
              <p className="text-sm text-[#8e8ea0]">Test your knowledge on any NCERT topic</p>
            </div>

            <div>
              <label htmlFor="quiz-topic" className="block text-xs font-medium text-[#8e8ea0] mb-2 uppercase tracking-wider">Topic</label>
              <input
                id="quiz-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchQuestion()}
                placeholder="e.g. Photosynthesis, Quadratic Equations, Electricity"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="quiz-subject" className="block text-xs font-medium text-[#8e8ea0] mb-2 uppercase tracking-wider">Subject</label>
              <select
                id="quiz-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="math">📐 Mathematics</option>
                <option value="science">🔬 Science</option>
                <option value="english">📖 English</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchQuestion}
              disabled={loading || !topic.trim()}
              className="w-full bg-white hover:bg-gray-100 disabled:opacity-30 rounded-xl py-3 font-semibold transition-all text-[#212121] text-sm"
            >
              {loading ? "Generating…" : "Start Quiz 🚀"}
            </button>
          </div>
        )}

        {/* ── QUIZ (Question Card) ──────────────────────────── */}
        {phase === "quiz" && question && (
          <div className={`${cardCls} space-y-5 animate-slide-up`} style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 rounded-full bg-white/[0.08] text-[#b4b4b4] border border-white/[0.08]">
                Question {questionsCompleted + 1}
              </span>
              <span className="text-xs text-[#8e8ea0]">{subject} • {topic}</span>
            </div>

            <div className="text-base font-medium leading-relaxed text-[#ececec] markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {question.question}
              </ReactMarkdown>
            </div>

            {question.options && question.options.length > 0 && (
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const letter = opt.charAt(0);
                  const isSelected = selectedAnswer === letter;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedAnswer(letter)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                        isSelected
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/[0.08] text-[#b4b4b4] hover:border-white/20 hover:text-[#ececec]"
                      } markdown-body`}
                      style={{ background: isSelected ? undefined : '#3a3a3a' }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {opt}
                      </ReactMarkdown>
                    </button>
                  );
                })}
              </div>
            )}

            {/* For non-MCQ, show text input */}
            {(!question.options || question.options.length === 0) && (
              <input
                type="text"
                value={selectedAnswer || ""}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Type your answer..."
                className={inputCls}
                style={inputStyle}
              />
            )}

            <button
              type="button"
              onClick={submitAnswer}
              disabled={!selectedAnswer || loading}
              className="w-full bg-white hover:bg-gray-100 disabled:opacity-30 rounded-xl py-3 font-semibold transition-all text-[#212121] text-sm"
            >
              {loading ? "Evaluating…" : "Submit Answer"}
            </button>
          </div>
        )}

        {/* ── RESULT ─────────────────────────────────────────── */}
        {phase === "result" && result && (
          <div className={`${cardCls} space-y-5 animate-slide-up`} style={cardStyle}>
            <div className="text-center">
              <span className="text-5xl block mb-3">{result.is_correct ? "🎉" : "💡"}</span>
              <h2 className={`text-2xl font-bold ${result.is_correct ? "text-green-400" : "text-yellow-400"}`}>
                {result.is_correct ? "Correct!" : "Not quite!"}
              </h2>
            </div>

            {result.feedback && (
              <div className="rounded-xl p-4 text-sm text-[#b4b4b4] leading-relaxed border border-white/[0.06] markdown-body" style={{ background: '#3a3a3a' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {result.feedback}
                </ReactMarkdown>
              </div>
            )}

            {result.new_difficulty && (
              <p className="text-center text-xs text-[#8e8ea0]">
                Current difficulty: <span className="text-[#ececec] font-medium">{result.new_difficulty}</span>
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={nextQuestion}
                className="flex-1 bg-white hover:bg-gray-100 rounded-xl py-3 font-semibold transition-all text-[#212121] text-sm"
              >
                Next Question →
              </button>
              <button
                onClick={resetQuiz}
                className="px-5 py-3 rounded-xl border border-white/[0.08] hover:border-white/20 transition-colors text-sm text-[#b4b4b4] hover:text-[#ececec]"
                style={{ background: '#3a3a3a' }}
              >
                New Topic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
