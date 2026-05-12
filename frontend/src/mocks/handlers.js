import { http, HttpResponse } from 'msw';
import students from './fixtures/students.json';
import dashboard from './fixtures/dashboard.json';

export const handlers = [
  // Dashboard Analytics
  http.get('/api/analytics/overview', () => {
    return HttpResponse.json(dashboard.overview);
  }),
  http.get('/api/analytics/topics', () => {
    return HttpResponse.json(dashboard.topics);
  }),
  http.get('/api/analytics/languages', () => {
    return HttpResponse.json(dashboard.languages);
  }),

  // Student Management
  http.get('/api/students', () => {
    return HttpResponse.json(students);
  }),
  http.get('/api/languages', () => {
    return HttpResponse.json([{ code: 'en', name: 'English' }]);
  }),

  // Quiz Evaluation
  http.post('/api/quiz/evaluate', async () => {
    return HttpResponse.json({
      is_correct: true,
      feedback: "Correct! Glucose is indeed the primary product.",
      new_difficulty: "medium"
    });
  }),
  http.post('/api/quiz/generate', async () => {
    return HttpResponse.json({
      question: "What is the primary product of photosynthesis?",
      options: ["A) Oxygen", "B) Glucose", "C) Carbon Dioxide", "D) Water"],
      correct_answer: "B",
      explanation: "Glucose is the sugar produced during photosynthesis."
    });
  }),

  // Chat Streaming Mock
  http.post('/api/chat/stream', () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Staggered chunks gated by macrotasks for fake timers
        setTimeout(() => {
          controller.enqueue(encoder.encode('data: {"type": "token", "content": "Chunk 1"}\n\n'));
        }, 100);
        
        setTimeout(() => {
          controller.enqueue(encoder.encode('data: {"type": "token", "content": "Chunk 2"}\n\n'));
        }, 200);
        
        setTimeout(() => {
          controller.enqueue(encoder.encode('data: {"type": "final", "content": "Chunk 1 Chunk 2", "response_language": "en"}\n\n'));
          controller.close();
        }, 250);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  }),
];
