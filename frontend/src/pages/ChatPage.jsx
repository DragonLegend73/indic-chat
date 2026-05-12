import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'
import { streamChat } from '../api/client'
import MessageBubble from '../components/chat/MessageBubble'
import { getLanguageName } from '../utils/languages'

export default function ChatPage() {
  const { student } = useStudent()
  const nav = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => { if (!student) nav('/') }, [student, nav])
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  if (!student) return null

  const sendMessage = async (text) => {
    if (!text.trim() || isStreaming) return
    const userMsg = { role: 'user', content: text, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    const assistantMsg = { role: 'assistant', content: '', timestamp: Date.now(), meta: {} }
    setMessages(prev => [...prev, assistantMsg])

    try {
      for await (const event of streamChat(student.id, text)) {
        if (event.type === 'meta') {
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], meta: event }
            return copy
          })
        } else if (event.type === 'token') {
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: copy[copy.length - 1].content + event.content,
            }
            return copy
          })
        } else if (event.type === 'translating') {
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...copy[copy.length - 1], isTranslating: true }
            return copy
          })
        } else if (event.type === 'final') {
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = {
              ...copy[copy.length - 1],
              content: event.content,
              responseLang: event.response_language,
              isTranslating: false,
            }
            return copy
          })
        }
      }
    } catch (err) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: '⚠️ Connection error. Please try again.', error: true }
        return copy
      })
    }
    setIsStreaming(false)
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#212121' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08]" style={{ background: '#171717' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/')} className="text-[#8e8ea0] hover:text-white transition-colors text-sm">← Back</button>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <h1 className="font-bold text-white text-lg">Indic-Chat</h1>
            <p className="text-xs text-[#8e8ea0]">
              {student.name} • {getLanguageName(student.preferred_language)} • {student.current_difficulty}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav('/quiz')}
            className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-2"
          >
            <span>📝</span>
            <span>Take a Quiz</span>
          </button>
          <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] text-[#b4b4b4] border border-white/[0.08]">
            22 Languages
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-6xl mb-4">📚</p>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Learn!</h2>
            <p className="text-[#8e8ea0] max-w-md text-sm">
              Ask me anything about NCERT Class 10 — Math, Science, or English.
              Type in any of 22 Indian languages or English!
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {[
                'What is photosynthesis?', 
                'Solve x² + 5x + 6 = 0', 
                'बीजगणित क्या है?', 
                'இயற்கணிதம் என்றால் என்ன?',
                'विद्युत धारा म्हणजे काय?',
                'అంతరిక్షం గురించి చెప్పు',
                'ଆଲୋକ ଶ୍ଲେଷଣ କ’ଣ?',
                'পরমশূন্য তাপমাত্রা কি?',
                'ગુરુત્વાકર્ષણ શું છે?'
              ].map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-sm px-3 py-2 rounded-xl bg-[#2f2f2f] border border-white/[0.08] hover:border-white/20 text-[#ececec] transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} student={student} />
        ))}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="shimmer rounded-2xl px-4 py-3 max-w-[70%] h-8" />
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 border-t border-white/[0.08]" style={{ background: '#171717' }}>
        <form onSubmit={e => { e.preventDefault(); sendMessage(input) }} className="flex items-center gap-3 max-w-4xl mx-auto">

          <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={isStreaming}
            placeholder="Ask in any language... (Hindi, Tamil, Telugu, English...)"
            className="flex-1 rounded-xl px-4 py-3 text-[#ececec] placeholder:text-[#8e8ea0] focus:outline-none transition-colors disabled:opacity-50 border border-white/[0.08] focus:border-white/20"
            style={{ background: '#2f2f2f' }} />
          <button type="submit" disabled={!input.trim() || isStreaming}
            className="bg-white hover:bg-gray-100 disabled:opacity-30 rounded-xl px-5 py-3 font-semibold transition-all text-[#212121] text-sm">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
