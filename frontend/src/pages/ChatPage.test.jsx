// @vitest-environment jsdom
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../test/utils';
import ChatPage from './ChatPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { server } from '../test/setup';
import { http, HttpResponse } from 'msw';

const testStudent = { 
  id: 's1', 
  name: 'Arjun', 
  preferred_language: 'hindi',
  current_difficulty: 'easy'
};

describe('ChatPage', () => {
  it('renders correctly after student selection', async () => {
    renderWithProviders(<ChatPage />, { initialStudent: testStudent });
    expect(await screen.findByPlaceholderText(/Ask in any language/i)).toBeInTheDocument();
  });

  it('handles message submission and staggered streaming', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPage />, { initialStudent: testStudent });

    const input = await screen.findByPlaceholderText(/Ask in any language/i);
    await user.type(input, 'Tell me about gravity{enter}');

    // Verify user message appears
    expect(screen.getByText('Tell me about gravity')).toBeInTheDocument();

    // Wait for first chunk
    await waitFor(() => {
      expect(screen.getByText(/Chunk 1/)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait for final state
    await waitFor(() => {
      expect(screen.getByText(/Chunk 1 Chunk 2/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows error message when stream fails', async () => {
    server.use(
      http.post('/api/chat/stream', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<ChatPage />, { initialStudent: testStudent });
    
    const input = await screen.findByPlaceholderText(/Ask in any language/i);
    await user.type(input, 'Test Error{enter}');

    await waitFor(() => {
      const errorBubble = screen.getByRole('alert');
      expect(errorBubble).toBeInTheDocument();
      expect(errorBubble).toHaveTextContent(/Connection error/i);
    });
  });

  it('navigates back to student select', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatPage />, { initialStudent: testStudent });
    
    const backBtn = screen.getByText(/← Back/i);
    await user.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles metadata events during streaming', async () => {
    // Override the stream to emit a 'meta' event
    server.use(
      http.post('/api/chat/stream', () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"type": "meta", "student": {"id": "s1", "current_difficulty": "medium"}}\n\n'));
            controller.enqueue(encoder.encode('data: {"type": "token", "content": "Hello"}\n\n'));
            controller.enqueue(encoder.encode('data: {"type": "final", "content": "Hello", "response_language": "hin_Deva"}\n\n'));
            controller.close();
          },
        });
        return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream' } });
      })
    );

    const user = userEvent.setup();
    renderWithProviders(<ChatPage />, { initialStudent: testStudent });
    
    const input = await screen.findByPlaceholderText(/Ask in any language/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    const form = input.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });
});
