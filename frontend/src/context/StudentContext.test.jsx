// @vitest-environment jsdom
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StudentProvider, useStudent } from './StudentContext';

describe('StudentContext', () => {
  const wrapper = ({ children }) => (
    <StudentProvider>{children}</StudentProvider>
  );

  it('initializes with default state', () => {
    const { result } = renderHook(() => useStudent(), { wrapper });
    expect(result.current.student).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.langCode).toBe('auto');
  });

  it('setStudent updates student and synchronizes langCode', () => {
    const { result } = renderHook(() => useStudent(), { wrapper });
    const mockStudent = { id: 's1', name: 'Arjun', preferred_language: 'hindi' };

    act(() => {
      result.current.setStudent(mockStudent);
    });

    expect(result.current.student).toEqual(mockStudent);
    expect(result.current.langCode).toBe('hindi');
  });

  it('addMessage appends a message to the history', () => {
    const { result } = renderHook(() => useStudent(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'Hello');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Hello' });
  });

  it('clearMessages resets the message history', () => {
    const { result } = renderHook(() => useStudent(), { wrapper });

    act(() => {
      result.current.addMessage('user', 'Hello');
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });
});
