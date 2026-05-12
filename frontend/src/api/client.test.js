import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as client from './client'
import { server } from '../test/setup'
import { http, HttpResponse } from 'msw'

describe('API Client Unit Tests', () => {
  beforeEach(() => {
    sessionStorage.clear()
    client.setAuthToken(null)
  })

  describe('Auth Token Management', () => {
    it('sets and removes auth token in sessionStorage', () => {
      client.setAuthToken('test-token')
      expect(sessionStorage.getItem('indic_admin_token')).toBe('test-token')
      client.setAuthToken(null)
      expect(sessionStorage.getItem('indic_admin_token')).toBeNull()
    })
  })

  describe('Students API', () => {
    it('gets students', async () => {
      const data = await client.getStudents()
      expect(Array.isArray(data)).toBe(true)
    })

    it('creates a student', async () => {
      const payload = { name: 'New Student', grade: '10' }
      const data = await client.createStudent(payload)
      expect(data.name).toBe(payload.name)
    })

    it('gets a single student', async () => {
      const data = await client.getStudent('s1')
      expect(data.id).toBe('s1')
    })

    it('updates a student', async () => {
      const data = await client.updateStudent('s1', { name: 'Updated' })
      expect(data.name).toBe('Updated')
    })
  })

  describe('Chat API', () => {
    it('sends a chat message', async () => {
      const data = await client.sendChat('s1', 'hello')
      expect(data.response).toBeDefined()
    })

    it('streams chat messages', async () => {
      const gen = client.streamChat('s1', 'hello')
      const chunks = []
      for await (const chunk of gen) {
        chunks.push(chunk)
      }
      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].token).toBeDefined()
    })
  })

  describe('Quiz API', () => {
    it('generates a quiz', async () => {
      const data = await client.generateQuiz('s1', 'math', 'Algebra')
      expect(data.question).toBeDefined()
    })

    it('evaluates a quiz', async () => {
      const data = await client.evaluateQuiz({ student_id: 's1', student_answer: '4' })
      expect(data.is_correct).toBeDefined()
    })

    it('uses namespaced quiz generate', async () => {
      const data = await client.quiz.generate('s1', 'math', 5)
      expect(data.question).toBeDefined()
    })

    it('uses namespaced quiz evaluate', async () => {
      const data = await client.quiz.evaluate('s1', 'q1', { q1: 'ans' })
      expect(data.is_correct).toBeDefined()
    })
  })

  describe('Analytics API', () => {
    it('gets overview', async () => {
      client.setAuthToken('token')
      const data = await client.getOverview()
      expect(data.total_students).toBeDefined()
    })

    it('gets namespaced analytics topics', async () => {
      client.setAuthToken('token')
      const data = await client.analytics.topics('s1')
      expect(Array.isArray(data)).toBe(true)
    })

    it('gets weak topics', async () => {
      client.setAuthToken('token')
      const data = await client.analytics.weakTopics('s1')
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('Media & Health API', () => {
    it('gets health status', async () => {
      const data = await client.getHealth()
      expect(data.status).toBe('ok')
    })
  })
})
