import { createContext, useContext, useState, useCallback } from 'react'
import { updateStudent } from '../api/client'

export const StudentContext = createContext(null)

export function StudentProvider({ children }) {
  const [student, setStudent] = useState(null)
  const [messages, setMessages] = useState([])
  const [langCode, setLangCode] = useState('auto')

  const addMessage = useCallback((role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const selectStudent = useCallback((s) => {
    setStudent(s)
    setLangCode(s?.preferred_language || 'auto')
    setMessages([])
  }, [])

  const updateLanguage = useCallback(async (newLang) => {
    setLangCode(newLang)
    if (student) {
      // Optimistically update the student state
      setStudent(prev => ({ ...prev, preferred_language: newLang }))
      try {
        await updateStudent(student.id, { preferred_language: newLang })
      } catch (err) {
        console.error("Failed to update student language in backend:", err)
      }
    }
  }, [student])

  return (
    <StudentContext.Provider value={{
      student,
      setStudent: selectStudent,
      messages,
      addMessage,
      clearMessages,
      langCode,
      setLangCode,
      updateLanguage,
    }}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudent must be inside StudentProvider')
  return ctx
}
