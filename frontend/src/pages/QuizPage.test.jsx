// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, waitFor } from '../test/utils';
import QuizPage from './QuizPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../test/setup';
import { http, HttpResponse } from 'msw';

const testStudent = { 
  id: 's1', 
  name: 'Arjun', 
  current_difficulty: 'easy' 
};

describe('QuizPage', () => {
  it('renders a guard message when no student is selected', async () => {
    renderWithProviders(<QuizPage />);
    // Guard text from QuizPage.jsx:42
    expect(await screen.findByText(/Please select a student first/i)).toBeInTheDocument();
  });

  it('completes the selection and submission flow with difficulty label update', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });

    // Phase: Setup - Type topic and start
    const topicInput = await screen.findByLabelText(/Topic/i);
    await user.type(topicInput, 'Science');
    const startBtn = screen.getByRole('button', { name: /Start Quiz/i });
    await user.click(startBtn);

    // Phase: Quiz - Question should appear (from MSW mock)
    // The question is mocked in handlers.js:46
    const questionText = await screen.findByText(/What is the primary product of photosynthesis?/i);
    expect(questionText).toBeInTheDocument();

    // Multi-step: Select option B then Submit
    const optionB = screen.getByRole('button', { name: /B\) Glucose/i });
    await user.click(optionB);
    const submitBtn = screen.getByRole('button', { name: /Submit Answer/i });
    await user.click(submitBtn);

    // Phase: Result - Verify "Correct!" and difficulty label transition
    expect(await screen.findByRole('heading', { name: /Correct!/i })).toBeInTheDocument();
    
    // Initial was 'easy', correct answer scales it to 'medium' via quizScore.js logic
    // Confirmed rendering target in QuizPage.jsx results section
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('navigates back to chat', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });
    const backBtn = screen.getByText(/← Back to Chat/i);
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });

  it('handles subject selection and reset', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });
    
    // Change subject
    const subjectSelect = screen.getByLabelText(/Subject/i);
    fireEvent.change(subjectSelect, { target: { value: 'english' } });
    expect(subjectSelect.value).toBe('english');

    // Type topic
    const topicInput = screen.getByLabelText(/Topic/i);
    await user.type(topicInput, 'Grammar');
    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    // Verify question mode
    expect(await screen.findByText(/Grammar/i)).toBeInTheDocument();

    // Answer and get to results
    const optionB = screen.getByRole('button', { name: /B\) Glucose/i }); // Using dummy options from mock
    await user.click(optionB);
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    // Click Reset
    const resetBtn = await screen.findByRole('button', { name: /New Topic/i });
    await user.click(resetBtn);

    // Should be back to setup
    expect(screen.getByText(/Start a Quiz/i)).toBeInTheDocument();
  });

  it('falls back to local evaluation if API fails', async () => {
    server.use(
      http.post('/api/quiz/evaluate', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });
    
    await user.type(screen.getByLabelText(/Topic/i), 'Biology');
    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    const optionB = await screen.findByRole('button', { name: /B\) Glucose/i });
    await user.click(optionB);
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    // Should still show results via evaluateAnswer fallback
    expect(await screen.findByRole('heading', { name: /Correct!/i })).toBeInTheDocument();
  });

  it('supports open-ended questions', async () => {
    server.use(
      http.post('/api/quiz/generate', () => {
        return HttpResponse.json({
          question: "Explain the gravity formula.",
          correct_answer: "F = Gmm/r^2",
          options: [] // Non-MCQ trigger
        });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });
    
    await user.type(screen.getByLabelText(/Topic/i), 'Gravity');
    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    const textInput = await screen.findByPlaceholderText(/Type your answer.../i);
    await user.type(textInput, 'F=Gmm/r2');
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    expect(await screen.findByRole('heading', { name: /Correct!/i })).toBeInTheDocument();
  });

  it('navigates to student select when the guard button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizPage />); // No student
    const goBtn = await screen.findByRole('button', { name: /Go to Student Select/i });
    await user.click(goBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows error message when quiz generation fails', async () => {
    server.use(
      http.post('/api/quiz/generate', () => {
        return new HttpResponse(JSON.stringify({ detail: 'Backend Overload' }), { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });
    
    await user.type(screen.getByLabelText(/Topic/i), 'FailTopic');
    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    expect(await screen.findByText(/Backend Overload/i)).toBeInTheDocument();
  });

  it('clears session state on next question click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizPage />, { initialStudent: testStudent });
    
    await user.type(screen.getByLabelText(/Topic/i), 'StateTest');
    await user.click(screen.getByRole('button', { name: /Start Quiz/i }));

    const optionB = await screen.findByRole('button', { name: /B\) Glucose/i });
    await user.click(optionB);
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }));

    // Phase is now results. Click "Next Question"
    const nextBtn = await screen.findByRole('button', { name: /Next Question/i });
    await user.click(nextBtn);

    // Should trigger loading then new question.
    // Verify that the answer selection is cleared (no "Submit" button until choice made)
    await screen.findByText(/What is the primary product/i);
    expect(screen.getByRole('button', { name: /Submit Answer/i })).toBeDisabled();
  });
});
