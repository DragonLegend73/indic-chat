import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudentProvider, StudentContext } from '../context/StudentContext';

/**
 * A test-only provider that allows initializing state directly.
 */
function MockStudentProvider({ children, initialStudent }) {
  const [student, setStudent] = React.useState(initialStudent);
  const [messages, setMessages] = React.useState([]);
  const [langCode, setLangCode] = React.useState(initialStudent?.preferred_language || 'auto');

  const selectStudent = React.useCallback((s) => {
    setStudent(s);
    setLangCode(s?.preferred_language || 'auto');
    setMessages([]);
  }, []);

  return (
    <StudentContext.Provider value={{
      student,
      setStudent: selectStudent,
      messages,
      addMessage: (role, content) => setMessages(p => [...p, { role, content, timestamp: Date.now() }]),
      clearMessages: () => setMessages([]),
      langCode,
      setLangCode,
    }}>
      {children}
    </StudentContext.Provider>
  );
}

export function renderWithProviders(ui, { initialEntries = ['/'], initialStudent = null, ...renderOptions } = {}) {
  function Wrapper({ children }) {
    const Provider = initialStudent ? MockStudentProvider : StudentProvider;
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <Provider initialStudent={initialStudent}>
          {children}
        </Provider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Re-export everything from RTL
export * from '@testing-library/react';
