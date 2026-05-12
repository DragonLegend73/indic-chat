/**
 * API Client — Central API layer for Indic-Chat frontend.
 */
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

let _authToken = sessionStorage.getItem('indic_admin_token') || null

export function setAuthToken(token) {
  _authToken = token
  if (token) {
    sessionStorage.setItem('indic_admin_token', token)
  } else {
    sessionStorage.removeItem('indic_admin_token')
  }
}

function authHeader() {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {}
}

export const getStudents = () => api.get('/students').then(r => r.data)
export const createStudent = (data) => api.post('/students', data).then(r => r.data)
export const getStudent = (id) => api.get(`/students/${id}`).then(r => r.data)
export const updateStudent = (id, data) => api.patch(`/students/${id}`, data, { headers: authHeader() }).then(r => r.data)

export const sendChat = (studentId, message) =>
  api.post('/chat', { student_id: studentId, message }).then(r => r.data)

export async function* streamChat(studentId, message) {
  // Use relative URL, handle absolute conversion in tests via globally patching fetch or here
  const url = (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')
    ? 'http://localhost/api/chat/stream'
    : '/api/chat/stream';
    
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, message }),
  })
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6))
        } catch {}
      }
    }
  }
}

export const generateQuiz = (studentId, topic, subject) =>
  api.post('/quiz/generate', { student_id: studentId, topic, subject }).then(r => r.data)

export const evaluateQuiz = (data) =>
  api.post('/quiz/evaluate', data).then(r => r.data)

export const quiz = {
  generate: (studentId, topic, numQuestions) =>
    api.post('/quiz/generate', { student_id: studentId, topic, subject: 'math', num_questions: numQuestions }).then(r => r.data),
  evaluate: (studentId, quizId, answers) =>
    api.post('/quiz/evaluate', { student_id: studentId, quiz_id: quizId, answers }).then(r => r.data),
}

export const getLanguages = () => api.get('/languages').then(r => r.data)

export const login = (password) => api.post('/auth/login', { password }).then(r => r.data)

export const auth = {
  login: (password) => api.post('/auth/login', { password }).then(r => r.data),
}

export const deleteStudent = (id) => api.delete(`/students/${id}`, { headers: authHeader() }).then(r => r.data)

export const analytics = {
  overview: () => api.get('/analytics/overview', { headers: authHeader() }).then(r => r.data),
  topics: () => api.get('/analytics/topics', { headers: authHeader() }).then(r => r.data),
  languages: () => api.get('/analytics/languages', { headers: authHeader() }).then(r => r.data),
  students: () => api.get('/analytics/students', { headers: authHeader() }).then(r => r.data),
  weakTopics: (id) => api.get(`/analytics/student/${id}/weak-topics`, { headers: authHeader() }).then(r => r.data),
}

export const getOverview = () => analytics.overview()

export const getHealth = () => api.get('/health').then(r => r.data)
