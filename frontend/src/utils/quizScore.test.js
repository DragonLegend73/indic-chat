import { describe, it, expect } from 'vitest';
import { evaluateAnswer } from './quizScore';

describe('evaluateAnswer', () => {
  it('identifies a correct answer ignoring case and trim', () => {
    const result = evaluateAnswer('  Photosynthesis  ', 'PHOTOSYNTHESIS', 'easy');
    expect(result.is_correct).toBe(true);
    expect(result.feedback).toContain('Correct');
  });

  it('identifies an incorrect answer', () => {
    const result = evaluateAnswer('Respiration', 'Photosynthesis', 'easy');
    expect(result.is_correct).toBe(false);
    expect(result.feedback).toContain('The correct answer is Photosynthesis');
  });

  it('scales difficulty from easy to medium on correct answer', () => {
    const result = evaluateAnswer('A', 'A', 'easy');
    expect(result.new_difficulty).toBe('medium');
  });

  it('scales difficulty from medium to hard on correct answer', () => {
    const result = evaluateAnswer('A', 'A', 'medium');
    expect(result.new_difficulty).toBe('hard');
  });

  it('stays at hard if already hard on correct answer', () => {
    const result = evaluateAnswer('A', 'A', 'hard');
    expect(result.new_difficulty).toBe('hard');
  });

  it('does not scale difficulty on incorrect answer', () => {
    const result = evaluateAnswer('B', 'A', 'easy');
    expect(result.new_difficulty).toBe('easy');
  });

  it('handles null or undefined user answers gracefully', () => {
    const result = evaluateAnswer(null, 'A', 'easy');
    expect(result.is_correct).toBe(false);
    expect(result.new_difficulty).toBe('easy');
  });
});
