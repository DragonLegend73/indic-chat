import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import axios from 'axios';

// MSW v2 expects absolute URLs in Node/jsdom.
// We patch axios to combine any relative baseURL and url into a single absolute URL.
axios.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith('http')) {
    const base = config.baseURL && !config.baseURL.startsWith('http') ? config.baseURL : '';
    config.url = new URL(base + config.url, 'http://localhost').href;
    config.baseURL = ''; // Clear relative baseURL so axios doesn't re-apply it
  }
  return config;
});

// Global fetch patch for relative URLs
const nativeFetch = global.fetch;
global.fetch = async (input, init) => {
  if (typeof input === 'string' && !input.startsWith('http')) {
    input = new URL(input, 'http://localhost').href;
  }
  return nativeFetch(input, init);
};

// Global mocks for jsdom/node compatibility
if (typeof window === 'undefined' || !window.sessionStorage) {
  const storage = new Map();
  const mockStorage = {
    getItem: vi.fn((key) => storage.get(key) || null),
    setItem: vi.fn((key, value) => storage.set(key, String(value))),
    removeItem: vi.fn((key) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
  };
  if (typeof window === 'undefined') {
    global.sessionStorage = mockStorage;
  } else {
    Object.defineProperty(window, 'sessionStorage', { value: mockStorage });
  }
}

// Initialize MSW server
export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Mocking scrollIntoView since it's not implemented in jsdom
  if (typeof window !== 'undefined') {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }

  // Mock KaTeX for math rendering coverage in MessageBubble.jsx
  if (typeof window !== 'undefined') {
    window.katex = {
      renderToString: vi.fn((math) => `<div class="katex-rendered">${math}</div>`),
    };
  }
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.restoreAllMocks();
  cleanup();
});

afterAll(() => {
  server.close();
});
